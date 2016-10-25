from sense_hat import SenseHat
import paho.mqtt.client as mqtt
import time
import configparser

config = configparser.ConfigParser()
config.read("config.cfg") 
mqtt_host = config.get("mqtt","host")
mqtt_port = config.getint("mqtt","port")
mqtt_username = config.get("mqtt","username")
mqtt_password = config.get("mqtt","password")

  

sense = SenseHat()

is_mqtt_connected = False

def on_mqtt_connect(client, userdata, flags, rc):
    global is_mqtt_connected
    is_mqtt_connected = True
    print(str(is_mqtt_connected))
    print("Connected with result code " + str(rc))
    client.subscribe("to-raspberryPiLedDisplay")
    

def on_mqtt_disconnect(client, userdata, rc):
    global is_mqtt_connected
    is_mqtt_connected = False
    if rc != 0:
        print("MQTT client lost connection unexpectedly. Reconnecting...")
    else:
        print("MQTT client disconnected successfuly")


def on_mqtt_message(client, userdata, msg):
    print(msg.topic + " " + str(msg.payload))
    payload = msg.payload.decode('utf-8')
    print(payload)
    sense.show_message(payload, text_colour=[255,0,0])


mqtt_client = mqtt.Client()
mqtt_client.username_pw_set(mqtt_username,mqtt_password)
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.on_message = on_mqtt_message

mqtt_client.connect(mqtt_host, mqtt_port, 60)
mqtt_client.loop_start()

while True:
    if is_mqtt_connected == False:
        print("Trying to connect to Spin backend...")
        try:
            mqtt_client.reconnect()
        except:
            print("Unable to reconnect...")
            pass
        
    
    t = sense.get_temperature()
    
    t = round(t, 1)
    
    msg = "{0}".format(t)

    payload = "POST /events\r\n\r\n"
    payload = payload + """
    {{
      "eventTypeCode":"temperatureMeasurement",
      "deviceCode":"raspberryPiTemperatureSensor",
      "userDefinedFields":{{
        "temperature":{{
          "value":{0}
        }}
      }}
    }}
    """.format(t)

    mqtt_client.publish("/from-device", payload)

    time.sleep(10)
