import { FastifyRequest, FastifyReply } from 'fastify'
import { Manager } from '../../../manager.js'

export const getAuthCallback = async (client: Manager, req: FastifyRequest, res: FastifyReply) => {
  const { code } = req.query as { code: string }

  if (!code) {
    return res.code(400).send({ error: 'No code provided' })
  }

  try {
    const redirectUri = `${client.config.utilities.WEB_SERVER.root_url || 'http://localhost:3000'}/v1/auth/callback`
    const clientId = client.config.utilities.WEB_SERVER.client_id || client.user!.id

    // DEBUG LOGS
    console.log('[DEBUG AuthCallback] Processing callback...')
    console.log(`[DEBUG AuthCallback] Code: ${code}`)
    console.log(`[DEBUG AuthCallback] Client ID: ${clientId}`)
    console.log(`[DEBUG AuthCallback] Redirect URI: ${redirectUri}`)
    console.log(
      `[DEBUG AuthCallback] Client Secret (masked): ${client.config.utilities.WEB_SERVER.client_secret ? '******' + client.config.utilities.WEB_SERVER.client_secret.slice(-4) : 'UNDEFINED'}`
    )

    const data = new URLSearchParams({
      client_id: clientId,
      client_secret: client.config.utilities.WEB_SERVER.client_secret || '',
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    })

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      body: data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    })

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text()
      console.error(
        `[DEBUG AuthCallback] Discord Error Response: ${tokenRes.status} ${tokenRes.statusText}`
      )
      console.error(`[DEBUG AuthCallback] Discord Error Body: ${errorText}`)

      client.logger.error(
        'AuthCallback',
        `Token fetch failed: ${tokenRes.status} ${tokenRes.statusText} - ${errorText}`
      )
      // Return detailed error to browser for debugging
      return res.code(500).send({
        error: 'Failed to fetch token',
        details: `${tokenRes.status} ${tokenRes.statusText}`,
        discord_response: errorText,
      })
    }

    const tokenData = await tokenRes.json()

    // Redirect to frontend with token
    // Changed to redirect to Home (/) instead of Dashboard (/dashboard) as requested
    return res.redirect(
      `/?token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token}`
    )
  } catch (err) {
    client.logger.error('AuthCallback', err)
    return res.code(500).send({ error: 'Internal server error' })
  }
}
