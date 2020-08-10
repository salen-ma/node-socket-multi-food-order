import { Connection } from 'sockjs'

export enum MessageTypeEnum {
  Open,
  Order,
  InitMenu,
}

export function sendMessage<Msg>(conn: Connection, type: MessageTypeEnum, payload: Msg): void {
  conn.write(JSON.stringify({
    type: type,
    payload: payload
  }))
}
