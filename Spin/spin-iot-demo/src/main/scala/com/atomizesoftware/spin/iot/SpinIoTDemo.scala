package com.atomizesoftware.spin.iot

import com.github.nscala_time.time.Imports._
import org.json4s._
import org.json4s.jackson.JsonMethods._
import org.json4s.JsonDSL._

import com.atomizesoftware.spin.SpinApp
import org.slf4j.LoggerFactory
import scala.slick.jdbc.JdbcBackend._
import scala.util.{Failure, Success, Try}
import com.atomizesoftware.spin.models._
import com.atomizesoftware.spin.auth.AuthenticatedUser

// Find all technical documentation at at http://docs.atomizesoftware.com/spin

case class SpinIoTDemo(spin: SpinApp) {

  //Implicits needed to remove boilerplate code
  implicit val eventRepository = spin.eventRepository
  implicit val deviceRepository = spin.deviceRepository
  implicit val userDefinedFieldsRepository = spin.userDefinedFieldsRepository
  implicit val orderRepository = spin.orderRepository

  // Needed by json4s to be able to extract values from userDefinedFields
  implicit val formats = DefaultFormats

  def eventManager_beforeInsert(tryOptEvent:Try[Option[Event]], extraParams:Map[String, Any],
    session:Session, user:AuthenticatedUser): Try[Option[Event]] = {

      implicit val currentUser:AuthenticatedUser = user

      spin.dataModel.db.withSession { implicit s:Session =>

        val modifiedEvent = for {
          Some(event) <- tryOptEvent
        } yield {

          event match {

            case m if m typeIs "temperatureAlarm" => {
              val qualityAssessmentOrder = Order(
                orderTypeId= spin.orderManager.typeWithCode("qualityAssessment").map(_.id).getOrElse(0),
                number = ""
              )

              val eventToReturn = spin.orderManager.createAndNotify(qualityAssessmentOrder) match {
                case Success(newOrder) => event.copy(orderId = newOrder.map(_.id))
                case Failure(ex) => throw ex
              }

              // event is changed before inserting
              Some(eventToReturn)
            }

            case _ => Some(event)
          }
        }

        //return the event that is going to be saved in the database
        modifiedEvent
      }
    }


  def eventManager_afterInsert(tryOptEvent:Try[Option[Event]], extraParams:Map[String, Any],
    session:Session, user:AuthenticatedUser): Try[Option[Event]] = {

        implicit val currentUser:AuthenticatedUser = user

        spin.dataModel.db.withSession { implicit s:Session =>

          val modifiedEvent = for {
            Some(event) <- tryOptEvent
          } yield {

            event match {

              case evt if evt typeIs "sendTextToRaspberry" => {
                if(event.notes.nonEmpty) {
                  spin.deviceManager.publishMqttMessage(
                    topic="to-raspberryPiLedDisplay",
                    message=event.notes.get
                  )
                }
                //no changes, so return the same
                Some(event)
              }

              case evt if evt typeIs "temperatureMeasurement" => {
                val currentTemperature = (event.userDefinedFields \ "temperature" \ "value").extract[Number]
                var lastReadingTimestamp = DateTime.now
                if(event.device.nonEmpty){
                  val device = event.device.get
                  spin.deviceRepository.updateDevice(device.copy(
                    userDefinedFields = device.withFields(
                      List(
                        ("currentTemperature" -> currentTemperature),
                        ("lastReadingTimestamp" -> lastReadingTimestamp)
                      )
                    )
                  ))
                }

                //no changes, so return the same
                Some(event)
              }

              case _ => Some(event)
            }
          }

          //the event that is going to be returned by the REST API
          modifiedEvent
        }
      }


    def orderManager_afterInsert(tryOptOrder:Try[Option[Order]], extraParams:Map[String, Any],
      session:Session, user:AuthenticatedUser): Try[Option[Order]] = {

        implicit val currentUser:AuthenticatedUser = user

        spin.dataModel.db.withSession { implicit s:Session =>

          for {
            Some(order) <- tryOptOrder
          } yield {

            order match {
              case ord if ord typeIs "qualityAssessment" => {
                val onSiteInspectionEvent = Event(
                  eventStatusId = spin.eventManager.statusWithCode("PENDING").map(_.id).getOrElse(0),
                  eventTypeId = spin.eventManager.typeWithCode("onSiteInspection").map(_.id).getOrElse(0),
                  createUserId = user.id,
                  assignedUserId = Some(user.id),
                  createDateTime = DateTime.now,
                  orderId = Some(order.id),
                  invoicingStatusId = spin.eventManager.invoicingStatusWithCode("UNINVOICED").map(_.id).getOrElse(0),
                  plan = false
                )

                spin.eventManager.createAndNotify(onSiteInspectionEvent)

                order
              }

              case _ => order
            }
          }
        }

        tryOptOrder
    }
  }
