import { Connection } from 'sockjs'
import { MessageTypeEnum, sendMessage } from './SocketMessage'

// 菜单项
interface OrderItem {
  id: string
  name: string
  price: number
  img: string
  orderNum: number
}

// 点餐消息类型
interface OrderMessage {
  id: string
  operate: string
}

// 初始化顾客菜单消息
interface InitCustomerMenuMessage {
  menuList: OrderItem[]
}

class Customer {
  public id: string
  private conn: Connection
  public roomId: string

  constructor (roomId: string, conn: Connection) {
    this.id = conn.id
    this.conn = conn
    this.roomId = roomId
  }

  public enterRoom (room: Room) {
    sendMessage<InitCustomerMenuMessage>(this.conn, MessageTypeEnum.InitMenu, {
      menuList: room.menuList
    })
  }

  public orderFood (orderMessage: OrderMessage) {
    sendMessage<OrderMessage>(this.conn, MessageTypeEnum.Order, orderMessage)
  }
}

class Room {
  private id: string
  private customers: Customer[] = []
  public menuList: OrderItem[] = [
    {id: '01', name: '鹌鹑蛋', price: 28.00, img: './imgs/dish-anchundan.png', orderNum: 0},
    {id: '02', name: '红苕粉', price: 12.00, img: './imgs/dish-hongshufen.png', orderNum: 0},
    {id: '03', name: '黄喉', price: 32.00, img: './imgs/dish-huanghou.png', orderNum: 0},
    {id: '04', name: '郡花', price: 38.00, img: './imgs/dish-junhua.png', orderNum: 0},
    {id: '05', name: '嫩牛肉', price: 32.00, img: './imgs/dish-nenniurou.png', orderNum: 0},
    {id: '06', name: '千层肚', price: 28.00, img: './imgs/dish-qiancengdu.png', orderNum: 0}
  ]

  constructor (id: string) {
    this.id = id
  }

  public addCustomer (customer: Customer) {
    this.customers.push(customer)
    customer.enterRoom(this)
  }

  public removeCustomer (customerId: string) {
    this.customers = this.customers.filter(item => item.id !== customerId)
  }

  // 更新已点菜单
  private updateMenu (orderMessage: OrderMessage) {
    for (let i = 0; i < this.menuList.length; i++) {
      let item = this.menuList[i]
      if (item.id === orderMessage.id) {
        if (orderMessage.operate === 'add') {
          item.orderNum++
        }
        if (orderMessage.operate === 'del' && item.orderNum > 0) {
          item.orderNum--
        }
        break;
      }
    }
  }

  // 某个顾客点餐，通知除此点餐顾客之外的其他顾客
  public orderFood (customerId: string, orderMessage: OrderMessage) {
    this.updateMenu(orderMessage)
    this.customers.filter(item => item.id !== customerId)
                  .forEach(item => {
                    item.orderFood(orderMessage)
                  })
  }
}

export class Ding {
  private usedRooms: {
    [id: string]: Room
  } = {}

  private customers: {
    [id: string]: Customer
  } = {}

  private isRoomUse (roomId: string) {
    return this.usedRooms.hasOwnProperty(roomId)
  }

  private openRoom (id: string, room: Room) {
    this.usedRooms[id] = room
  }

  private customerEnterDing (customer: Customer) {
    this.customers[customer.id] = customer
    this.customerEnterRoom(customer)
  }

  private customerEnterRoom (customer: Customer) {
    let customerRoom: Room
    const isRoomUse = this.isRoomUse(customer.roomId)
    if (isRoomUse) {
      customerRoom = this.usedRooms[customer.roomId]
      customerRoom.addCustomer(customer)
    } else {
      customerRoom = new Room(customer.roomId)
      customerRoom.addCustomer(customer)
      this.openRoom(customer.roomId, customerRoom)
    }
  }

  // 收到某顾客发来的点餐消息后，找出该顾客所属餐桌，同步消息给餐桌其他顾客
  private roomOrderFood (customerId: string, orderMessage: OrderMessage) {
    const nowOrderCustomer = this.customers[customerId]
    const nowOrderRoom = this.usedRooms[nowOrderCustomer.roomId]
    nowOrderRoom.orderFood(customerId, orderMessage)
  }

  public removeCustomer(customerId: string) {
    const leaveCustomer = this.customers[customerId]
    const leaveCustomerRoom = this.usedRooms[leaveCustomer.roomId]
    leaveCustomerRoom.removeCustomer(customerId)
  }

  // 处理顾客消息
  public handMessage (message, conn: Connection) {
    const { type, payload } = message
    switch (type) {
      case MessageTypeEnum.Open:
        const customer = new Customer(payload.roomId, conn)
        this.customerEnterDing(customer)
      break;
      case MessageTypeEnum.Order:
        this.roomOrderFood(conn.id, {
          id: payload.id,
          operate: payload.operate
        })
      break;
    }
  }
}
