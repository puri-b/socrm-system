import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier: string) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

export async function GET(request: NextRequest) {
  const appUrl =
    (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin).replace(/\/+$/, '');

  const tenantId = process.env.AZURE_AD_TENANT_ID || 'organizations';
  const clientId = process.env.AZURE_AD_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=microsoft_login_failed', appUrl));
  }

  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  const state = crypto.randomBytes(24).toString('hex');
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  const authUrl = new URL(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
  );

  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', 'openid profile email offline_access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl);

  const cookieOptions = {
    httpOnly: true as const,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  };

  response.cookies.set('ms_oauth_state', state, cookieOptions);
  response.cookies.set('ms_code_verifier', codeVerifier, cookieOptions);

  console.log('Microsoft login init:', {
    appUrl,
    redirectUri,
    hasClientId: !!clientId,
    stateLength: state.length,
    verifierLength: codeVerifier.length,
    nodeEnv: process.env.NODE_ENV,
  });

  return response;
}