export const environment = {
  production: false,
  supabase: {
    url: import.meta.env['NG_APP_SUPABASE_URL'],
    anonKey: import.meta.env['NG_APP_SUPABASE_ANON_KEY'],
  },
  dolarApiUrl: 'https://ve.dolarapi.com/v1/dolares',
};
