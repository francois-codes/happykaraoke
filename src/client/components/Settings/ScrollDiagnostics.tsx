import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useStore } from '@/store'
import { ToggleDebugScrollAnchors } from './ToggleDebugScrollAnchors'
import {
  readScrollDiagnosticsEnabled,
  readScrollDiagnosticsVerbose,
  scrollDiagnosticLog,
  setScrollDiagnosticsEnabled,
  setScrollDiagnosticsVerbose
} from '@shared/lib/scrollDiagnosticLog'
import { useCallback, useState } from 'react'
import packageJson from '../../../../package.json'

export function ScrollDiagnostics() {
  const store = useStore()
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(readScrollDiagnosticsEnabled)
  const [verbose, setVerbose] = useState(readScrollDiagnosticsVerbose)

  const buildMeta = useCallback(() => {
    return {
      appVersion: packageJson.version,
      scrollMaster: !!store.scrollMaster,
      isAdmin: !!store.isAdmin,
      electron: typeof window !== 'undefined' && !!window.electron?.writeScrollDiagnosticLog,
      currentSongId: store.currentSong ?? null
    }
  }, [store.scrollMaster, store.isAdmin, store.currentSong])

  const getExportText = useCallback(() => {
    return scrollDiagnosticLog.serializeJson(buildMeta(), 2)
  }, [buildMeta])

  const copyLog = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getExportText())
      toast({ title: 'Journal copié', description: 'Collez-le dans Cursor ou un fichier texte.' })
    } catch {
      toast({
        title: 'Copie impossible',
        description: 'Utilisez « Télécharger » ou enregistrez via Electron.',
        variant: 'destructive'
      })
    }
  }, [getExportText, toast])

  const saveToDisk = useCallback(async () => {
    const text = getExportText()
    if (window.electron?.writeScrollDiagnosticLog) {
      try {
        const { path } = await window.electron.writeScrollDiagnosticLog(text)
        toast({
          title: 'Journal enregistré',
          description: path
        })
      } catch (e) {
        toast({
          title: 'Échec enregistrement',
          description: e instanceof Error ? e.message : String(e),
          variant: 'destructive'
        })
      }
    }
  }, [getExportText, toast])

  const revealFolder = useCallback(async () => {
    if (window.electron?.revealScrollDiagnosticLogs) {
      try {
        await window.electron.revealScrollDiagnosticLogs()
      } catch {
        toast({ title: 'Impossible d’ouvrir le dossier', variant: 'destructive' })
      }
    }
  }, [toast])

  const downloadJson = useCallback(() => {
    const text = getExportText()
    const blob = new Blob([text], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scroll-diagnostic-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast({ title: 'Téléchargement lancé' })
  }, [getExportText, toast])

  const clearLog = useCallback(() => {
    scrollDiagnosticLog.clear()
    toast({ title: 'Journal scroll vidé' })
  }, [toast])

  return (
    <div className="flex flex-col gap-3 border-t border-b pt-4">
      <div>
        <p className="text-sm font-medium">Diagnostics scroll</p>
        <p className="text-xs text-muted-foreground mt-1">
          Enregistre avertissements et erreurs de défilement pour le débogage.
        </p>
      </div>
      <ToggleDebugScrollAnchors />
      <div className="flex items-center space-x-2">
        <Switch
          id="scroll-diag-enabled"
          checked={enabled}
          onCheckedChange={(v) => {
            setEnabled(v)
            setScrollDiagnosticsEnabled(v)
          }}
        />
        <Label htmlFor="scroll-diag-enabled">Activer le journal scroll</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          id="scroll-diag-verbose"
          checked={verbose}
          onCheckedChange={(v) => {
            setVerbose(v)
            setScrollDiagnosticsVerbose(v)
          }}
        />
        <Label htmlFor="scroll-diag-verbose">Mode verbeux (détails / positions)</Label>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => void copyLog()}
        >
          Copier le journal
        </Button>
        {typeof window !== 'undefined' && window.electron?.writeScrollDiagnosticLog ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => void saveToDisk()}
            >
              Enregistrer dans le dossier de l’app
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => void revealFolder()}
            >
              Ouvrir le dossier debug-logs
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={downloadJson}
          >
            Télécharger JSON
          </Button>
        )}
        <Button type="button" variant="ghost" size="sm" className="w-full" onClick={clearLog}>
          Vider le buffer
        </Button>
      </div>
    </div>
  )
}
