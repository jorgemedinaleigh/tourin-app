import { Client, Account, ID, Avatars, TablesDB } from 'react-native-appwrite'

export const client = new Client()
  .setProject('68b3979b00322d8633b1')
  .setPlatform('com.dolmen.tourinapp')
  .setEndpoint('https://sfo.cloud.appwrite.io/v1');

export const account = new Account(client)
export const avatars = new Avatars(client)
export const tables = new TablesDB(client)