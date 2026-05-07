// Máscaras centralizadas de inputs

/** Telefone BR: (11) 99999-9999 ou (11) 9999-9999 */
export function maskTelefone(v: string): string {
    const nums = (v ?? "").replace(/\D/g, "").slice(0, 11);
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`;
}

/** CEP BR: 99999-999 */
export function maskCEP(v: string): string {
    const nums = (v ?? "").replace(/\D/g, "").slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
}

/** Altura em metros: X.XX — dígitos auto-formatados, primeiro dígito máx 2 (limite @Max(3)) */
export function maskAltura(v: string): string {
    const nums = (v ?? "").replace(/\D/g, "").slice(0, 3);
    if (nums.length === 0) return "";
    const first = String(Math.min(parseInt(nums[0], 10), 2));
    const rest = nums.slice(1);
    if (nums.length === 1) return first;
    return `${first}.${rest}`;
}

/** Peso em kg: até 300.X — aceita ponto decimal livre, máx 3 dígitos inteiros + 1 decimal */
export function maskPeso(v: string): string {
    const raw = (v ?? "").replace(/[^\d.]/g, "");
    if (!raw) return "";
    const dotIdx = raw.indexOf(".");
    if (dotIdx === -1) return raw.slice(0, 3);
    const intPart = raw.slice(0, dotIdx).slice(0, 3);
    if (!intPart) return "";
    const decPart = raw.slice(dotIdx + 1).replace(/\./g, "").slice(0, 1);
    return `${intPart}.${decPart}`;
}

/** CEP condicional: se for só números, aplica máscara; caso contrário devolve texto livre (nome de local). */
export function maskCepOuLocal(v: string): string {
    const t = (v ?? "").trim();
    const soNums = t.replace(/\D/g, "");
    // Se o usuário está digitando basicamente só números, trata como CEP.
    if (soNums.length > 0 && soNums.length === t.replace(/[\s-]/g, "").length) {
        return maskCEP(t);
    }
    return v;
}

/** Remove tudo que não for dígito (útil antes de enviar para API). */
export function onlyDigits(v: string): string {
    return (v ?? "").replace(/\D/g, "");
}
