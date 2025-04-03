//
//  PoseLandmarks.swift
//  movement
//
//  Created by Ailson Freire on 13/03/25.
//

import Foundation
import React
import MediaPipeTasksVision

class PoseLandmarkerResultProcessor: NSObject, PoseLandmarkerLiveStreamDelegate {

  weak var eventEmitter: RCTEventEmitter?

  init(eventEmitter: RCTEventEmitter) {
    self.eventEmitter = eventEmitter
  }

  func poseLandmarker(
    _ poseLandmarker: PoseLandmarker,
    didFinishDetection result: PoseLandmarkerResult?,
    timestampInMilliseconds: Int, error: Error?
  ) {

    if let error = error {
      print("Error: \(error.localizedDescription)")
      eventEmitter?.sendEvent(withName: "onPoseLandmarksError", body: ["error": error.localizedDescription])
    }

    guard let result = result else {
      print("No result received.")
      return
    }

    // Prepare the data to be sent back to JavaScript
    let landmarksArray = NSMutableArray()

    for poseLandmarks in result.landmarks {
      let poseArray = NSMutableArray()
      for(index, poseMark) in poseLandmarks.enumerated(){
        let landmarkMap = NSMutableDictionary()
        landmarkMap["keypoint"] = index
        landmarkMap["x"] = poseMark.x
        landmarkMap["y"] = poseMark.y
        landmarkMap["z"] = poseMark.z
        landmarkMap["visibility"] = poseMark.visibility
        landmarkMap["presence"] = poseMark.presence
        poseArray.add(landmarkMap)
      }
      landmarksArray.add(poseArray)
    }

    let params: [String: Any] = ["landmarks": landmarksArray]
    eventEmitter?.sendEvent(withName: "onPoseLandmarksDetected", body: params)

  }

}

@objc(PoseLandmarks)
class PoseLandmarks: RCTEventEmitter {

  private var resultProcessor: PoseLandmarkerResultProcessor?

  override init() {
    super.init()
    initModel()
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func supportedEvents() -> [String]! {
    return ["onPoseLandmarksDetected", "onPoseLandmarksStatus", "onPoseLandmarksError"]
  }

  @objc
  func initModel() {
    do {
      // Initialize the result processor and set it as the delegate
      resultProcessor = PoseLandmarkerResultProcessor(eventEmitter: self)

      // Initialize the Pose Landmarker
      let modelName = "pose_landmarker_lite"
      let modelPath = Bundle.main.path(forResource: modelName, ofType: "task")

      guard let actualModelPath = modelPath else {
        print("Error: \(modelName).task not found in bundle.")
        sendErrorEvent("Model file \(modelName).task not found.")
        return
      }

      let options = PoseLandmarkerOptions()
      options.baseOptions.modelAssetPath = actualModelPath
      options.runningMode = .liveStream
      options.minTrackingConfidence = 0.6
      options.minPoseDetectionConfidence = 0.7
      options.minPosePresenceConfidence = 0.7
      options.poseLandmarkerLiveStreamDelegate = resultProcessor

      try PoseLandmarkerHolder.shared.initializePoseLandmarker(with: options)
      // Send success event to JS
      print("PoseLandmarker initialized with \(modelName).task")
    } catch {
      print("Error initializing PoseLandmarker: \(error.localizedDescription)")
      sendErrorEvent("Error initializing PoseLandmarker: \(error.localizedDescription)")
    }
  }

  private func sendErrorEvent(_ error: String) {
     let errorParams: [String: Any] = ["error": error]
     sendEvent(withName: "onPoseLandmarksError", body: errorParams)
  }
}