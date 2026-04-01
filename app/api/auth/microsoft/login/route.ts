import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

function base64UrlEncode(input: Buffer) {
  return input.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function GET(request: NextRequest) {
  const tenantId = process.env.AZURE_AD_TENANT_ID || 'organizations';
  const clientId = process.env.AZURE_AD_CLIENT_ID;
  const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const redirectUri = `${appUrl}/api/auth/microsoft/callback`;

  if (!clientId) {
    return NextResponse.redirect(new URL('/login?error=microsoft_login_failed', appUrl));
  }

  const state = crypto.randomBytes(24).toString('hex');
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());

  const authUrl = new URL(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', 'openid profile email offline_access');
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');

  const response = NextResponse.redirect(authUrl);
  response.cookies.set('ms_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });
  response.cookies.set('ms_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10,
  });

  return response;
}
