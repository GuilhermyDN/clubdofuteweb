const KEY = "cdf_first_login_done";

export function shouldRedirectToEuAfterLogin(): boolean {
  // DEV/TESTE: sempre vai pro /eu
  if (import.meta.env.DEV) return true;

  // PROD: só na primeira vez
  return localStorage.getItem(KEY) !== "1";
}

export function markFirstLoginDone(): void {
  localStorage.setItem(KEY, "1");
}