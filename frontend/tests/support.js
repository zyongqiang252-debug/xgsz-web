import { expect } from '@playwright/test';
export const credentials = { username:'e2e-manager', password:'Test-memory-only-Password12!' };
let managerClient=0;
export async function manager(page) {
  let response = await page.request.get('/api/auth/session');
  let state = (await response.json()).data;
  if(state.setupRequired) {
    response=await page.request.post('/api/auth/setup',{headers:{'X-CSRF-TOKEN':state.csrf},data:credentials});
    expect(response.ok()).toBe(true);
  }
  response=await page.request.post('/api/auth/login',{headers:{'X-CSRF-TOKEN':state.csrf,'X-Forwarded-For':`192.0.2.${++managerClient}`},data:credentials});
  expect(response.ok()).toBe(true);
}
