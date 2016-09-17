# Spin-IoT-Demo

In this demo you will see Spin connected to a Raspberry Pi 3, as an example how Spin connects people and things in business processes.

## Features

* Web dashboard shows temperature sent by the Raspberry Pi
* Clicking the button "Trigger a temperature alarm" will create an Order (how Spin calls a process or case) of type `Quality Assessment`. That order will automatically contain the `Temperature Alarm` movement (how Spin calls both events and actions) that was created when the button was clicked, and will automatically create an `On-site inspection` movement assigned to you. The Spin Android app will receive the pending movement, you can open it, write notes, take photos and close it
* Send text to display in the LED display of the Raspberry Pi. You can use the dashboard to send it and see it in the live video (be patient, the video has a delay of around 20 seconds)
* You can also send text to the Raspberry from the Android app, in the Actions tab


This is the code for the demo available at [iot-demo.atomizecloud.com](https://iot-demo.atomizecloud.com/admin).


Want to login and see it live? Fill out [this form in our website](https://atomizesoftware.com/form/iot-trial).

## What to run this demo in your computer?

### Tools you will need to install

* A Java runtime: [Oracle](http://www.java.com/) or [OpenJDK](http://openjdk.java.net/), version 1.7 or later
* [Scala 2.11.8](http://www.scala-lang.org/download/)
* [SBT 0.13](http://www.scala-sbt.org/download.html)
* [PostgreSQL 9.4](https://www.postgresql.org/download/)
* [Spin SDK](https://atomizesoftware.com/spin/sdk)
* Spin Android app from the [Play Store](https://play.google.com/store/apps/details?id=com.atomizesoftware.spin)
* A Raspberry Pi 3 with a Sense Hat board. If you don't have any of these, you can still run the demo, only without receiving temperature values and you not see the text sent to the Raspberry :)


### Setup

* First install all the tools above :)
* Get the code from this Github repository `git clone https://github.com/atomizesoftware/Spin-IoT-Demo.git`
* Using pgadmin or psql command line utility, create a new database `CREATE DATABASE spin_iot_demo`
* Unzip the Spin SDK file to some folder in your computer and run `java -jar spin-sdk.jar setup-db`. When asked to `create\update database` say yes, when asked `fill with demo data` say no
* Rename `application.conf.example` in folder `Spin-IoT-Demo/Spin/spin-iot-demo/src/main/resources/application.conf` and edit the settings (database parameters, your local IP for the MQTT broker, file paths)
* go to the folder `Spin-IoT-Demo/Spin/spin-iot-demo` and rename `build.sbt.example` to `build.sbt`
* Edit `build.sbt` and in line 110 enter the username and password that you have received when you requested the Spin SDK
* in the same folder (`Spin-IoT-Demo/Spin/spin-iot-demo`) run `sbt run`
* Open `http://localhost:8080/admin` in your web browser and login with username:`admin` and password:`admin`. With this user you will see all options in Spin. In the live demo at `https://iot-demo.atomizecloud.com` you will less options

#### Android app

* Install the Spin Android app from the [Play Store](https://play.google.com/store/apps/details?id=com.atomizesoftware.spin)
* In the settings (cog wheel icon in the startup screen, or Settings option after login), set the URL to `http://localhost:8080`
* The app will resync everything (give it a couple of minutes) and then login with `admin`/`admin`


### I need help!

Shoot an email to <a href="mailto:support@atomizesoftware.com">support@atomizesoftware.com</a> or, even better, get into our [Slack Channel for Developers](https://atomizesoftware.com/slack) and talk directly with our development team.
