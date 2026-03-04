const KEY = "cdf_first_login_done";

export function isFirstLogin(): boolean {
  return localStorage.getItem(KEY) !== "1";
}

export function markFirstLoginDone(): void {
  localStorage.setItem(KEY, "1");
}