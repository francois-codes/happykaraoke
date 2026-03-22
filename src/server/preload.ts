import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openDialog: async () => {
    const result = ipcRenderer.invoke('request:datapath:selection')
    return result
  },
  writeScrollDiagnosticLog: (content: string) =>
    ipcRenderer.invoke('scroll-diagnostic-log:write', content) as Promise<{ path: string; name: string }>,
  revealScrollDiagnosticLogs: () => ipcRenderer.invoke('scroll-diagnostic-log:reveal') as Promise<void>
})
