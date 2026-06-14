// Le package `disposable-email-domains` ne fournit pas de types.
// Son point d'entrée (`main`) est un JSON : un tableau de domaines.
declare module "disposable-email-domains" {
  const domains: string[];
  export default domains;
}
