export const saveChampionHash = (hash: string) => {
  localStorage.setItem("championHash", hash);
};

export const fetchChampionHash = (): string | null => {
  return localStorage.getItem("championHash");
};

export const removeChampionHash = () => {
  return localStorage.removeItem("championHash");
};
