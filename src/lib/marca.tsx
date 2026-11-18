// Emblema em JSX "puro" (compatível com next/og) para ícones e imagens de partilha.
export const COR_MARCA = "#0f4c5c";
export const COR_LATAO = "#c99a45";

export function EmblemaOg({ tamanho }: { tamanho: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 40 40">
      <rect width="40" height="40" rx="4" fill={COR_MARCA} />
      <path d="M20 6 23 17 34 20 23 23 20 34 17 23 6 20 17 17Z" fill="#ffffff" />
      <path d="M20 6 23 17 20 20Z M34 20 23 23 20 20Z M20 34 17 23 20 20Z M6 20 17 17 20 20Z" fill={COR_MARCA} opacity="0.35" />
      <circle cx="20" cy="20" r="2.4" fill={COR_LATAO} />
    </svg>
  );
}
