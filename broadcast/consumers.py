import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ClassConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.class_name = self.scope['url_route']['kwargs']['class_name']
        self.class_group_name = 'chat_%s' % self.class_name

        # Join room group
        await self.channel_layer.group_add(
            self.class_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.class_group_name,
            self.channel_name
        )

    # Receive message from WebSocket, forward onto other websockets using specified method
    async def receive(self, text_data):
        dataJson = json.loads(text_data)
        payload = dataJson['payload']
        if dataJson['type'] == 'message':
            # Send message to room group
            await self.channel_layer.group_send(
                self.class_group_name,
                {
                    'type': 'chat_message',
                    'payload': dataJson['payload'],
                    'sender': dataJson['sender'],
                    'time': dataJson['time']
                }
            )
        elif dataJson['type'] == 'broadcast':
            # Send code to room group
            await self.channel_layer.group_send(
                self.class_group_name,
                {
                    'type': 'broadcast',
                    'payload': dataJson['payload'],
                    'sender': dataJson['sender'],
                    'time': dataJson['time']
                }
            )
        elif dataJson['type'] == 'share':
        # Send code to room group
            await self.channel_layer.group_send(
                self.class_group_name,
                {
                    'type': 'share',
                    'payload': dataJson['payload'],
                    'sender': dataJson['sender'],
                    'time': dataJson['time']
                }
            )
        elif dataJson['type']  == 'review':
            # Send code to all teachers in the group
            await self.channel_layer.group_send(
                self.class_group_name,
                {
                    'type': 'review_request',
                    'payload': dataJson['payload'],
                    'sender': dataJson['sender'],
                    'time': dataJson['time']
                }
            )
        elif dataJson['type'] == 'userdata':
            # Adding user to userlist  < Need to implement this shit later
            # global allUsers.update({dataJson['sender']: dataJson['payload']}
            await self.channel_layer.group_send(
                self.class_group_name,
                {
                    'type': 'join',
                    'payload': dataJson['payload'],
                    'sender': dataJson['sender'],
                    'time': dataJson['time']
                }
        )

    # Receive message from room group
    async def chat_message(self, event):

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))

    # Share code with the class
    async def share(self, event):

        # Send code to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'share',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))

    # Broadcast code to the entire class
    async def broadcast(self, event):

        # Send code to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'broadcast',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))
    
    # Receive review request from class
    async def review_request(self, event):

        # Send code to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'review_request',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))

    # Receive a join message on connect
    async def join(self, event):
    # Send code to WebSocket

            await self.send(text_data=json.dumps({
            'type': 'newUser',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))

    async def leave(self, event):

        # Send code to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'userLeft',
            'payload': event['payload'],
            'sender': event['sender'],
            'time': event['time']
        }))