import '@testing-library/jest-dom'
import { TextDecoder, TextEncoder } from 'node:util'

// jsdom no expone TextEncoder/TextDecoder, requeridos por react-router-dom
// al importarse dentro del entorno de pruebas.
if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder
}

// Undici usa los streams web y MSW usa BroadcastChannel; jsdom no los expone.
const { ReadableStream, TransformStream, WritableStream } = require('node:stream/web')
const { BroadcastChannel } = require('node:worker_threads')

for (const [name, value] of Object.entries({
  ReadableStream,
  TransformStream,
  WritableStream,
  BroadcastChannel,
})) {
  if (typeof globalThis[name] === 'undefined') {
    globalThis[name] = value
  }
}

// MSW construye objetos `Request`/`Response` al interceptar peticiones.
// jsdom no implementa la Fetch API, así que se completa con Undici. Se carga
// después de definir TextEncoder porque Undici lo necesita al importarse.
const { FormData, Headers, Request, Response, fetch } = require('undici')

for (const [name, value] of Object.entries({ FormData, Headers, Request, Response, fetch })) {
  if (typeof globalThis[name] === 'undefined') {
    globalThis[name] = value
  }
}
