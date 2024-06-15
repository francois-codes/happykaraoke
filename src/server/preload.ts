import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electron', {
  openDialog: async () => {
    const result = ipcRenderer.invoke('request:datapath:selection')
    return result
  }
})
