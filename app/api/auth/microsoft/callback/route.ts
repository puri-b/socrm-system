import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { generateToken } from '@/lib/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function decodeJwtPayload(token?: string): Record<string, any> {
  if (!token) return {};
  const parts = token.split('.');
  if (parts.length < 2) return {};
  try {
    const payload = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

export async function GET(request: NextRequest) {
  const appUrl =
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '');

  const tenantId = process.env.AZURE_AD_TENANT_ID || 'organizations';
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET;
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const error = request.nextUrl.searchParams.get('error');

  const oauthBundleRaw = request.cookies.get('ms_oauth_bundle')?.value;

  let savedState = '';
  let codeVerifier = '';

  try {
    if (oauthBundleRaw) {
      const parsed = JSON.parse(oauthBundleRaw);
      savedState = parsed?.state || '';
      codeVerifier = parsed?.codeVerifier || '';
    }
  } catch (e) {
    console.error('Failed to parse ms_oauth_bundle:', e);
  }

  console.log('SSO callback debug:', {
    hasCode: !!code,
    hasState: !!state,
    hasSavedState: !!savedState,
    hasCodeVerifier: !!codeVerifier,
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    error,
  });

  if (
    error ||
    !code ||
    !state ||
    !savedState ||
    state !== savedState ||
    !clientId ||
    !clientSecret ||
    !codeVerifier
  ) {
    console.error('Microsoft callback validation failed', {
      error,
      codeExists: !!code,
      stateExists: !!state,
      savedStateExists: !!savedState,
      stateMatched: state === savedState,
      clientIdExists: !!clientId,
      clientSecretExists: !!clientSecret,
      codeVerifierExists: !!codeVerifier,
    });

    return NextResponse.redirect(
      new URL('/login?error=microsoft_login_failed', appUrl)
    );
  }

  try {
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
      scope: 'openid profile email offline_access',
    });

    const tokenResponse = await fetch(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        cache: 'no-store',
      }
    );

    if (!tokenResponse.ok) {
      const badText = await tokenResponse.text();
      console.error('Microsoft token exchange failed:', badText);
      return NextResponse.redirect(
        new URL('/login?error=microsoft_login_failed', appUrl)
      );
    }

    const tokens = await tokenResponse.json();
    const idClaims = decodeJwtPayload(tokens.id_token);

    let userInfo: any = {};
    if (tokens.access_token) {
      try {
        const userInfoResponse = await fetch(
          'https://graph.microsoft.com/oidc/userinfo',
          {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
            cache: 'no-store',
          }
        );

        if (userInfoResponse.ok) {
          userInfo = await userInfoResponse.json();
        } else {
          const userInfoText = await userInfoResponse.text();
          console.error('Microsoft userinfo failed:', userInfoText);
        }
      } catch (e) {
        console.error('Microsoft userinfo request failed:', e);
      }
    }

    const email =
      userInfo.email ||
      userInfo.preferred_username ||
      idClaims.email ||
      idClaims.preferred_username ||
      idClaims.upn;

    const providerUserId = userInfo.sub || idClaims.oid || idClaims.sub;
    const fullName = userInfo.name || idClaims.name || '';
    const firstName = userInfo.given_name || idClaims.given_name || '';
    const lastName = userInfo.family_name || idClaims.family_name || '';

    if (!email) {
      console.error('Microsoft login failed: email not found in claims/userinfo');
      return NextResponse.redirect(
        new URL('/login?error=microsoft_email_missing', appUrl)
      );
    }

    const existing = await query(
      `SELECT user_id, email, full_name, department, role, is_active, user_provider, allow_sso_login, allowed_departments
       FROM x_socrm.users
       WHERE LOWER(email) = LOWER($1)
       LIMIT 1`,
      [email]
    );

    if (existing.rows.length > 0) {
      const user = existing.rows[0];

      if (!user.is_active) {
        return NextResponse.redirect(
          new URL('/login?error=microsoft_account_not_allowed', appUrl)
        );
      }

      await query(
        `UPDATE x_socrm.users
         SET provider_user_id = COALESCE($1, provider_user_id),
             user_provider = 'AzureAD',
             allow_sso_login = true,
             first_name = COALESCE(NULLIF($2, ''), first_name),
             last_name = COALESCE(NULLIF($3, ''), last_name),
             full_name = COALESCE(NULLIF($4, ''), full_name),
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $5`,
        [
          providerUserId || null,
          firstName || null,
          lastName || null,
          fullName || null,
          user.user_id,
        ]
      );

      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        department: user.department,
        role: user.role,
        full_name: user.full_name,
        allowed_departments: Array.isArray(user.allowed_departments) ? user.allowed_departments : [],
      } as any);

      const response = NextResponse.redirect(new URL('/dashboard', appUrl));

      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      response.cookies.set(
        'sso_user_bootstrap',
        JSON.stringify({
          user_id: user.user_id,
          email: user.email,
          department: user.department,
          role: user.role,
          full_name: user.full_name,
          allowed_departments: user.allowed_departments || null,
        }),
        {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 60 * 5,
          path: '/',
        }
      );

      response.cookies.set('ms_oauth_bundle', '', {
        maxAge: 0,
        path: '/',
      });

      return response;
    }

    const onboardingToken = jwt.sign(
      {
        type: 'sso_onboarding',
        email,
        provider_user_id: providerUserId || null,
        full_name: fullName || [firstName, lastName].filter(Boolean).join(' '),
        first_name: firstName,
        last_name: lastName,
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    const onboardingUrl = new URL('/login/complete-profile', appUrl);
    onboardingUrl.searchParams.set('token', onboardingToken);
    onboardingUrl.searchParams.set('email', email);
    onboardingUrl.searchParams.set('full_name', fullName || '');
    onboardingUrl.searchParams.set('first_name', firstName || '');
    onboardingUrl.searchParams.set('last_name', lastName || '');

    const response = NextResponse.redirect(onboardingUrl);
    response.cookies.set('ms_oauth_bundle', '', {
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (err) {
    console.error('Microsoft callback error:', err);
    return NextResponse.redirect(
      new URL('/login?error=microsoft_login_failed', appUrl)
    );
  }
}