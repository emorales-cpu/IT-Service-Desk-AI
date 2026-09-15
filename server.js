import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Carga las variables del archivo .env o .env.local
dotenv.config();
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 🔑 Genera un Access Token temporal usando tu Refresh Token permanente
async function getZohoAccessToken() {
  const params = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token'
  });

  const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    body: params
  });

  const data = await response.json();
  if (!data.access_token) {
    throw new Error(`Error en autenticación Zoho: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// 📥 Endpoint al que llamará tu aplicación React para traer tickets en tiempo real
app.get('/api/zoho/tickets', async (req, res) => {
  try {
    const accessToken = await getZohoAccessToken();

    // Consulta los tickets en Zoho Desk API
    const zohoResponse = await fetch('https://desk.zoho.com/api/v1/tickets?limit=100', {
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`
      }
    });

    const ticketsData = await zohoResponse.json();
    res.json(ticketsData);
  } catch (error) {
    console.error('Error consultando Zoho Desk:', error);
    res.status(500).json({ error: error.message || 'No se pudo conectar con Zoho Desk' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor puente Zoho activo en http://localhost:${PORT}`);
});