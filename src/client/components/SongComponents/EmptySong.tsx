export function EmptySong() {
  return (
    <div className={`w-full h-full flex flex-col gap-12 items-start justify-center`}>
      {<h1 className="text-3xl font-bold">Pas de chanson selectionnée</h1>}
      <p>La prochaine chanson s&apos;affichera ici très vite</p>
    </div>
  )
}
