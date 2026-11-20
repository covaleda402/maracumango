import { Router, type Request, type Response } from 'express';
import { query, isDatabaseConfigured } from '../db';
import { requireAdmin } from '../middleware/auth';
import { DEFAULT_BUSINESS_CONFIG } from '../../src/data/mockData';

const router = Router();

const devFallbackSettings: any = {
  businessName: DEFAULT_BUSINESS_CONFIG.businessName,
  logoUrl: '/logo-maracumango.png',
  mainAddress: DEFAULT_BUSINESS_CONFIG.mainAddress,
  city: DEFAULT_BUSINESS_CONFIG.city,
  whatsappNumber: DEFAULT_BUSINESS_CONFIG.whatsappNumber,
  shiftInfo: DEFAULT_BUSINESS_CONFIG.shiftInfo,
};

// GET /api/settings — Get business visual identity & configuration
router.get('/', async (_req: Request, res: Response) => {
  if (!isDatabaseConfigured()) {
    return res.json(devFallbackSettings);
  }

  try {
    const result = await query('SELECT * FROM business_settings WHERE id = $1', ['default']);
    if (result.rows.length === 0) {
      return res.json({
        businessName: 'Maracumango',
        logoUrl: '/logo-maracumango.png',
        mainAddress: 'Cra. 7 / Calle 21, Parque del Amor y la Amistad',
        city: 'Neiva, Huila',
        whatsappNumber: '3177401873',
        shiftInfo: 'Turno 1: 7:30 a.m. – 2:30 p.m. | Turno 2: 2:30 p.m. – 11:00 p.m.',
      });
    }

    const row = result.rows[0];
    res.json({
      businessName: row.business_name,
      logoUrl: row.logo_url,
      mainAddress: row.main_address,
      city: row.city,
      whatsappNumber: row.general_whatsapp,
      shiftInfo: row.shift_info,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/settings — Update branding, logo & settings (Admin only)
router.put('/', requireAdmin, async (req: Request, res: Response) => {
  const { businessName, logoUrl, mainAddress, city, whatsappNumber, shiftInfo } = req.body;

  if (!isDatabaseConfigured()) {
    devFallbackSettings.businessName = businessName !== undefined ? businessName : devFallbackSettings.businessName;
    devFallbackSettings.logoUrl = logoUrl !== undefined ? logoUrl : devFallbackSettings.logoUrl;
    devFallbackSettings.mainAddress = mainAddress !== undefined ? mainAddress : devFallbackSettings.mainAddress;
    devFallbackSettings.city = city !== undefined ? city : devFallbackSettings.city;
    devFallbackSettings.whatsappNumber = whatsappNumber !== undefined ? whatsappNumber : devFallbackSettings.whatsappNumber;
    devFallbackSettings.shiftInfo = shiftInfo !== undefined ? shiftInfo : devFallbackSettings.shiftInfo;
    return res.json({
      message: 'Configuración de identidad visual y negocio actualizada con éxito (Modo local).',
      settings: devFallbackSettings,
    });
  }

  try {
    const result = await query(
      `INSERT INTO business_settings (id, business_name, logo_url, main_address, city, general_whatsapp, shift_info, updated_at)
       VALUES ('default', $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         business_name = COALESCE($1, business_settings.business_name),
         logo_url = COALESCE($2, business_settings.logo_url),
         main_address = COALESCE($3, business_settings.main_address),
         city = COALESCE($4, business_settings.city),
         general_whatsapp = COALESCE($5, business_settings.general_whatsapp),
         shift_info = COALESCE($6, business_settings.shift_info),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [businessName, logoUrl, mainAddress, city, whatsappNumber, shiftInfo]
    );

    const row = result.rows[0];
    res.json({
      message: 'Configuración de identidad visual y negocio actualizada con éxito.',
      settings: {
        businessName: row.business_name,
        logoUrl: row.logo_url,
        mainAddress: row.main_address,
        city: row.city,
        whatsappNumber: row.general_whatsapp,
        shiftInfo: row.shift_info,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
