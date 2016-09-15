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
  implicit val movementRepository = spin.movementRepository
  implicit val deviceRepository = spin.deviceRepository
  implicit val userDefinedFieldsRepository = spin.userDefinedFieldsRepository
  implicit val orderRepository = spin.orderRepository

  // Needed by json4s to be able to extract values from userDefinedFields
  implicit val formats = DefaultFormats

  def movementManager_beforeInsert(tryOptMovement:Try[Option[Movement]], extraParams:Map[String, Any],
    session:Session, user:AuthenticatedUser): Try[Option[Movement]] = {

      implicit val currentUser:AuthenticatedUser = user

      spin.dataModel.db.withSession { implicit s:Session =>

        val modifiedMovement = for {
          Some(movement) <- tryOptMovement
        } yield {

          movement match {

            case m if m typeIs "temperatureAlarm" => {
              val qualityAssessmentOrder = Order(
                orderTypeId= spin.orderManager.typeWithCode("qualityAssessment").map(_.id).getOrElse(0),
                number = ""
              )

              val movementToReturn = spin.orderManager.createAndNotify(qualityAssessmentOrder) match {
                case Success(newOrder) => movement.copy(orderId = newOrder.map(_.id))
                case Failure(ex) => throw ex
              }

              // movement is changed before inserting
              Some(movementToReturn)
            }

            case _ => Some(movement)
          }
        }

        //return the movement that is going to be saved in the database
        modifiedMovement
      }
    }


  def movementManager_afterInsert(tryOptMovement:Try[Option[Movement]], extraParams:Map[String, Any],
    session:Session, user:AuthenticatedUser): Try[Option[Movement]] = {

        implicit val currentUser:AuthenticatedUser = user

        spin.dataModel.db.withSession { implicit s:Session =>

          val modifiedMovement = for {
            Some(movement) <- tryOptMovement
          } yield {

            movement match {

              case m if m typeIs "sendTextToRaspberry" => {
                if(movement.notes.nonEmpty) {
                  spin.deviceManager.publishMqttMessage(
                    topic="to-raspberryPiLedDisplay",
                    message=movement.notes.get
                  )
                }
                //no changes, so return the same
                Some(movement)
              }

              case m if m typeIs "temperatureMeasurement" => {
                val currentTemperature = (movement.userDefinedFields \ "temperature" \ "value").extract[Number]
                var lastReadingTimestamp = DateTime.now
                if(movement.device.nonEmpty){
                  val device = movement.device.get
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
                Some(movement)
              }

              case _ => Some(movement)
            }
          }

          //the movement that is going to be returned by the REST API
          modifiedMovement
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
                val onSiteInspectionMovement = Movement(
                  movementStatusId = spin.movementManager.statusWithCode("PENDING").map(_.id).getOrElse(0),
                  movementTypeId = spin.movementManager.typeWithCode("onSiteInspection").map(_.id).getOrElse(0),
                  createUserId = user.id,
                  assignedUserId = Some(user.id),
                  createDateTime = DateTime.now,
                  orderId = Some(order.id),
                  invoicingStatusId = spin.movementManager.invoicingStatusWithCode("UNINVOICED").map(_.id).getOrElse(0),
                  plan = false
                )

                spin.movementManager.createAndNotify(onSiteInspectionMovement)

                order
              }

              case _ => order
            }
          }
        }

        tryOptOrder
    }
  }
