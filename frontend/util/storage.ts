export const saveChampionHash = (hash: string) => {
    localStorage.setItem("championHash", hash);
}

export const getChampionHash = () => {
    return localStorage.getItem("championHash");
}
