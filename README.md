# HappiKaraoke v2

🎶🎸🎹🥁🎤🎶

This project is a reboot of the HappiKaraoke app. The original app had great features, but the stack was getting old, and I figured I could try to update it with a more modern approach.

## Features

#### Original features:

- exposes a web server to serve the app, so that external devices can join a karaoke session on a browser
- Users can join either by typing the URL of the host in the browser, or flashing the QR code on the app
- Users can toggle chords on and off
- the admin controls the session: the song being played, the tonality, and the scroll within the song
- the admin can browse through available songs and select which one is being played.
- the admin can change the directory where the songs are stored

#### New features:

- ✨ brand new app infrastructure and new UI
- 🌙 Users can now toggle between a dark and a light theme
- 🚀 The admin can enable automatic scrolling, and set the speed of the scroll

#### Upcoming features:

- sessions are named
- proper sessions logs
- smoother auto scrolling and jumping between sessions
- ability for users to request songs
- ability for admins to queue songs

## Architecture

The app runs on Electron, but it is approached as a standard web app, with a server side, a client side, and a shared folder for common code. There is no Electron renderer process, and the app is served through a local server running on the Electron main process with the nodeIntegration enabled. I understand it might not be the best in terms of security, or the standard approach, but this isn't a concern for this app. There's nothing to hack here ! And besides, this is needed to allow people to join a session from their browser.

The shared code folder is an attempt to achieve some form of tRPC, where the server and client side are sharing the same code for endpoints and socket messages. Everything is fully typed, so we're sure there is a strong contract between the server and the client, enforced by the typescript compiler. It's been a good UX to implement & consume endpoints this way.

After a lot of browsing, I couldn't find a boilerplate that would tick all the boxes needed:

- runs a node.js server that can accessed by any device on the host's network
- the host (admin running the electron app) and the guests (users joining via the browser) are running the same code - which ruled out ipc since this wouldn't work when running the app in a browser
- ability for the client to easily invoke endpoints on the node.js server, from within the electron app as well as from the browser, without having crazy CSP / CORS issues
- implement rest endpoints & sockets on the server
- using modern tooling (typescript, react, vite)
- simple developer experience
- reliable build process

I tried some options:

- Nextron: it looks good, but it exports the next.js app as a static site, so we loose next.js's api handler feature, which I wish I could have used. Nextron does this as it only uses next.js for the renderer process. I considered running next.js but I wasn't sure how to start the server without exporting the app as a static site as Nextron does, or having to tap into next.js's internals to start the server, which is never a good idea.
- Electron-vite: a very good bootstrap, but it didn't provide the hooks needed to tap in the vite server so that I wouldn't have to run 2 server instances in dev mode. This was close though, and maybe I missed something. I tried several time as I was really impressed by how good this package is in terms of UX. But I got stuck trying to register endpoints on the express server running on the main process, and having weird node resolution errors when trying to run the vite dev server in the main process.

I also considered for a moment to run the server in a docker container inside the electron app, but I quickly shook it off as I didn't have weeks to spend battling with docker and electron.

So I ended up bootstrapping this from scratch. In the end I'm fairly happy as I have been able to achieve all of the above.
The stack is as follows:

#### Server side

express.js server, using socket.io for websockets, and built with esbuild. Somehow I couldn't get imports work for the server code, so building with esbuild looked like a solid option. The server package includes the preload script file (also built with esbuild).
The server side code is pretty lean as the implementation of the endpoints & the socket messages is done in the shared folder, and these are declared in a way that they are bound to the socket & express server in a very easy way.

the server side has 2 entry points:

- index.ts => used in dev mode, starts the express server with the vite middleware for the client. Electron is not running here and none of the electron API will work. As an alternative, there is a `npm run dev:electron` script, but it runs the other entry points and has a few limitations explained below.
- main.ts => used in electron, starts the express server, opens a `BrowserWindow` and loads the home page of the express server, which uses the `express.static` middleware so there are no references to the vite server in the electron process. This is where I would have loved to start the vite dev server when running electron in dev mode, but I couldn't figure it out. Seems like some sort of ESM / CJS issue (the package is not using ESM as the electron app wouldn't build with it, but I might give it another go)

In spite of these 2 entry points, the express server implementation is shared in both modes so it doesn't have have to be duplicated. It has a hook which is used to either configure express's static assets middle or the vite dev server depending on the entry point used.

```typescript
import { startServer } from '@shared/server/server'

startServer((app) => {
  // runs in the express bootstrap, before setting up the listener
})
```

#### Client side

React client, built with vite. The front end uses react-router for routing. I'm not using any state library to keep things simple, and because the server drives most of the app state from the websockets, I didn't feel the need for a client side state manager library

#### Shared code

The shared code is written in typescript, and is used by both the server and the client. The trick here is that the shared folder is imported by two different js environments, so I had to make sure that the code was not using modules that would fail to build one part or the other. The client is using some polyfills to make sure node modules can be used there without breaking the client side build. And when I have to use something that would break the client, I use the dependency injection pattern so that I don't have to directly import the module from within the shared folder. The only hack I had to do was to use a node event emitter to emit websocket messages from the shared folder. It's not ideal, but it works and it's not a huge deal in this context.

All the code is in the `src` folder. Electron resources are in the `resources` folder, and build files in the `build` folder. The build outputs in `out` and this is where electron picks up what needs to be packaged in the artifacts.

#### Limitations and potential improvements

##### electron dev mode with hot reloading

The reason why the server has 2 entry points is because I couldn't figure out a way to run the vite dev server to serve the front end from the main process. I guess I could have make it work by making the front end be served as the renderer process, but because we need people to join a session on the hosted server by opening the device's host URL in a browser, I couldn't go down this route.

For this reason, most of the development is done by running the app as a standard dev server, which means that electron features are not available. This isn't a big deal as the only electron feature used is the dialog to open a folder. But to debug this, I had to do the following:

- build the client side by running `npm run build:client`
- run the electron app in dev mode with `npm run dev:electron`

Which is quite annoying since there's no hot reloading on either side. The vite build is pretty quick on the front end, but any change on the server side would require to kill the app & restart it.

So in the future, the best thing would be to replicate what was done on `electron-vite`, and provide a way to have effective hot reloading on both the server and the client side.

##### double vite config

Because the server in dev mode is creating its own instance of the vite dev server, it requires an inline configuration. I couldn't import the vite config at the root which is outside of the server's scope. This is not a big deal, but it's a bit annoying to have to maintain 2 vite configs. In case you need to modify the vite config, remember to also update it in the `src/server/index.ts` file before going crazy wondering why your changes don't apply.

## Project Setup

the project was built using node 20.11.0, and uses npm as a package manager. All dependencies are included and there should be no need for any global dependencies.

### Install

```bash
$ npm install
```

### Development

the dev command starts the app as a web server and doesn't launch the electron app. I may add this in the future, but for now I prefer this as it allows me to build the app without relying on any electron specific features which would break when the app is used in a browser

```bash
$ npm run dev
```

### Build

The build command runs several scripts which can be called separately:

- `npm run clean` - cleans the build folder & the tsbuildinfo files
- `npm run build:client` - builds the client side code with vite
- `npm run build:server` - builds the server side with esbuild
- `npm run build:electron` - builds the electron app, picking up whatever is in the `out` build folder. if that folder is empty, the app will be broken

To run everything in one go, you can run the build command:

```bash
$ npm run build
```

This creates the artefacts in the `dist` folder created by the electron build process. The binary can be launched from there.
Since this is also building the server & the client side, you can run the server fron the `out` by running `npm start`

## Contribute

All paths are aliased so you can import from the shared folder with `@shared`, from the client and from the server. Server & client side have aliases to their respective roots with `@`. The paths are defined in the `tsconfig.[node|web].json` files, in the vite config for the client side.
Both the server and the client can reference `@shared` but the client cannot import `@server` and the server cannot import `@client`.

### Set up

Currently there is an annoying thing: since users are handled in memory, when the server restarts, they are being removed, so you need to login again. As a workaround, if you set an entry in your session storage where `userId` is `devAdmin`, the app will consider you logged in as an admin
you can also use `userId` as `devUser` to be logged in as a guest. this way, no need to login again when the server restarts.

### Client side

#### structure

The client side is a basic React app build with vite. it uses tailwind, and should have most primitives for components in the `components` folder. UI elements are pulled from @shadcn-ui, based on @radix-ui primitives.

The routing is handled by react-router v6. Static assets are in the `assets` folder, including the main CSS which includes the tailwind directives. Try to keep things clean:

- components should be in the `components` folder
- hooks & services should be in the `lib` folder
- screens should be in the `screens` folder, they should mainly use components and hooks from the relevant folders
- routes are declared in router.tsx and should only reference screens

#### Store

While I didn't feel the need to implement a redux store or something similar, there is a lightweight store that can be used as follows:

```typescript
import { useStore, useDispatch } from '@/store'

export function MyComponent() {
  // fully typed
  const { currentSong } = useStore()
  const dispatch = useDispatch()

  function setSong(songTitle) {
    // fully typed
    dispatch({ currentSong: songTitle })
  }

  return (
    // jsx here
  )
}

```

It's a very basic store for a bunch of setting and it is fairly limited but it should be good enough for most use cases. If you need something more complex, there's probably a better way to achieve that anyway.

#### front end architecture

The front uses React-router v6 to handle routes. New screens can simply be created in the `screens` folder, and added to the router. Screens should be wrapped in the `Screen` component which handles data initialization, and can redirect to the relevant routes depending on the scenario. If an admin user reloads the page, its user id will be kept in session storage and can be reused to continue the session without re-creating it. Guests can also continue their session in the browser, provided they are not closing the tab. Because the main admin frequently uses the app across multiple tabs, I had to use sessionStorage to make sure the userId stored was not bleeding into sessions opened in other tabs.

#### keyboard shortcuts

There are many keyboard shortcuts in the app. They're great, especially for power users, and for managing a karaoke session while playing the keyboard for instance. The list of available keyboard shortcuts can be found in the [cheatsheet]('./CHEATSHEET.md')

There is a nice bit of utility to easily implement keyboard shortcuts. It's a react hook that takes care of all the heavy lifting: registering & removing the event listener, handling default key prevention, mapping keys & modifiers to the action, etc. It can be used like this:

```typescript
import { useKeyboardShortcut } from '@/lib/useKeyboardShortcut'
import { KEYS } from '@/lib/consts'

function MyComponent() {

  useKeyboardShortcut({
    key: [KEYS.SPACE],
    modifier: [KEYS.Meta], // optional
    preventDefault: true, // optional, but useful when using a shortcut bound to something else typically
    disable: () => !searchOpen, // optional
    handler: (event) => {
      // do something
      // event is passed if needed, but this will only be
      // invoked if the key pressed matches the key & modifier
      // and if the disable predicate returns false
    }
    // to make sure you always get a correct closure, you can pass in an array of dependencies
    // to remove & add the listener again when the dependencies change. defaults to []
  }, [searchOpen])

  return (
    // jsx here
  )
}

```

#### data fetching

For data fetching, check out in the server side section below how endpoints & socket messages are created & consumed on the client side.

### Server side

On the server side, the only thing that could be needed is to create new endpoints or socket messages. These should be build in the shared folder, the provided factory functions, and exported in the `src/shared/endpoints/index.ts` or `src/shared/messages/index.ts` files.

#### endpoints

To create an endpoint, simply declare it with the `createEndpoint` function

```typescript
// my-endpoint.ts

interface RequestBody {}

interface ResponseBody {}

export const myEndpoint = createEndpoint<RequestBody, ResponseBody>({
  method: 'post', // supports get, post, put, delete,
  url: '/my-endpoint',
  handler: async (req, res) => {
    // implementation here
    // req.body is typed with RequestBody (post, put)
    // req.params is typed with RequestBody (get)
    // res.json is typed with ResponseBody
  }
})
```

Then export it in the main endpoint file

```typescript
// src/shared/endpoints/index.ts
export const endpoints = [
  // other endpoints
  myEndpoint
]
```

That's it. The endpoint is automatically registered in the express.js app. you can call it directly from the client side like this.
if the request is a post or a put request, it will put the payload in the body of the request. If it's a get request, it will put the payload in the params of the request, and you'll be able to get it in req.params.

```typescript
// src/client/component/my-component.tsx

import { myEndpoint } from '@shared/endpoints/my-endpoint';

export function MyComponent() {

  const callEndpoint = async () => {
    const data = await myEndpoint.call({ /* typed with RequestBody */ });
    // data is typed with ResponseBody
  }

  return (
    // jsx here
  )
}

```

#### Messages

Socket messages are a little more tricky and complicated as there can be multiple scenarios:

- message sent from the client to the server
- message sent from the client to the server, with an acknowledgement
- message sent from the server to the client

The factory function `createMessage` can handle all these scenarios, and the message can be used in the same way as an endpoint.

```typescript
// src/shared/my-message.ts

// this is the payload of the emitted event
interface InboundPayload {
  prop: string
}

// this is the payload of the acknoledgement. if you're not expecting an ack, you can use `unknown` and skip the callback
interface OutboundPayload {
  message: string
}

export const myMessage = createMessage<InboundPayload, OutboundPayload>({
  event: 'my-message',
  handler: async (payload, callback) => {
    // handler is optional. Only implement it if you need to listen
    // server side to an event emitted on the client.
    // it will automatically register the server side listener

    // payload is typed with InboundPayload
    const someValue = payload.prop

    // callback's arg is typed with OutboundPayload
    callback({ message: someValue + ': some response' })

    // if you don't need an acknoledgement, you can skip the callback
  }
})
```

If it is a message that the server should listen to, export it in the main message file

```typescript
// src/shared/messages/index.ts

import { myMessage } from './my-message'

export const message = [
  // other messages
  myMessage
]
```

To emit the message from the server side, just use the provided function

```typescript
import { myMessage } from '@shared/messages/my-message'

// emit's arg is typed with InboundPayload
myMessage.server.emit({ prop: 'some value' })
```

To listen to the message on the client side, just use the provided function

```typescript
// somewhere in src/client
import { myMessage } from '@shared/messages/my-message'
import { socket } from '@utils/socket'

myMessage.client.listen(socket, (payload) => {
  // payload is typed with inboundPayload
})
```

On the client side, you're more likely to use the message in a React component, but there's a hook for that, that handles the subscription and unsubscription for you, with optional dependencies

```typescript
// somewhere in src/client
import { myMessage } from '@shared/messages/my-message'
import { socket } from '@utils/socket'

export function MyComponent() {

  myMessage.client.useMessage(socket, (payload) => {
    // payload is typed with inboundPayload
  }, [/* optional dependencies */])

  return (
    // jsx here
  )
}

```

And lastly, you may want to emit a message with acknoledgement from the client side. There is also a function for that

```typescript
// somewhere in src/client
import { myMessage } from '@shared/messages/my-message'
import { socket } from '@utils/socket'

export async function MyFunction() {
  // emit's payload arg is typed with InboundPayload
  // response is typed with OutboundPayload
  const response = await myMessage.client.emitWithAck(socket, { prop: 'some value' })

  return response.message
}
```
