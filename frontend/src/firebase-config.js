import { initializeApp } from 'firebase/app'
import { getMessaging, isSupported } from 'firebase/messaging'

const firebaseConfig = {
  apiKey: 'AIzaSyDi1yPnksRHUOs1d80DcjW6HJmgPpjL5fg',
  authDomain: 'elpationotificaciones.firebaseapp.com',
  projectId: 'elpationotificaciones',
  storageBucket: 'elpationotificaciones.firebasestorage.app',
  messagingSenderId: '257910510655',
  appId: '1:257910510655:web:a74de4eed338259dec948a',
  measurementId: 'G-SHQCH33CC1',
}

const app = initializeApp(firebaseConfig)

async function getFirebaseMessaging() {
  try {
    const supported = await isSupported()
    if (!supported) return null
    return getMessaging(app)
  } catch {
    return null
  }
}

export { app, getFirebaseMessaging }
