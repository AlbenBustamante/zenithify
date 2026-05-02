import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const targetPath = './src/environments/environment.prod.ts';
const envConfigFile = `
export const environment = {
  production: true,
  supabase: {
    url: '${process.env['SUPABASE_URL']}',
    anonKey: '${process.env['SUPABASE_ANON_KEY']}',
  },
  dolarApiUrl: 'https://ve.dolarapi.com/v1/dolares'
};
`;

fs.writeFileSync(targetPath, envConfigFile);
