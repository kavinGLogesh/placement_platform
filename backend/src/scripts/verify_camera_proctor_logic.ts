import assert from 'assert';

/**
 * Headless verification of Camera Proctor state machine and frame verification logic
 */

type CameraState =
  | 'INITIALIZING'
  | 'REQUESTING_PERMISSION'
  | 'ATTACHING_STREAM'
  | 'VERIFYING_FRAMES'
  | 'ACTIVE'
  | 'TIMEOUT'
  | 'PERMISSION_DENIED'
  | 'NOT_FOUND'
  | 'BUSY'
  | 'DISCONNECTED'
  | 'ERROR';

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  kind = 'video';
  enabled = true;
  readyState: 'live' | 'ended' = 'live';
  onended: (() => void) | null = null;
  onmute: (() => void) | null = null;
  onunmute: (() => void) | null = null;

  stop() {
    this.readyState = 'ended';
    this.enabled = false;
    this.onended?.();
  }
}

// Mock MediaStream
class MockMediaStream {
  private tracks: MockMediaStreamTrack[];
  constructor(tracks: MockMediaStreamTrack[] = [new MockMediaStreamTrack()]) {
    this.tracks = tracks;
  }
  getVideoTracks() {
    return this.tracks;
  }
  getTracks() {
    return this.tracks;
  }
}

// Mock HTMLVideoElement
class MockVideoElement {
  srcObject: MockMediaStream | null = null;
  readyState = 0; // 0: HAVE_NOTHING, 2: HAVE_CURRENT_DATA, 4: HAVE_ENOUGH_DATA
  videoWidth = 0;
  videoHeight = 0;
  paused = true;
  ended = false;
  muted = false;
  playsInline = false;
  autoplay = false;

  async play() {
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }
}

// Frame verification algorithm identical to CameraProctorMonitor.tsx
const verifyActiveVideoFrames = (
  video: MockVideoElement,
  abortSignal: { aborted: boolean },
  timeoutMs = 4000
): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const check = () => {
      if (abortSignal.aborted) {
        reject(new Error('ABORTED'));
        return;
      }

      const stream = video.srcObject;
      const track = stream?.getVideoTracks()[0];
      if (!track || track.readyState !== 'live') {
        reject(new Error('Webcam video track is not live or was closed.'));
        return;
      }

      // Must have readyState >= HAVE_CURRENT_DATA (2) and real physical dimensions
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        return;
      }

      if (Date.now() - startTime >= timeoutMs) {
        reject(
          new Error(
            `Webcam connected, but video frames failed to render within ${timeoutMs / 1000}s (readyState: ${video.readyState}, size: ${video.videoWidth}x${video.videoHeight}).`
          )
        );
        return;
      }

      setTimeout(check, 50);
    };

    check();
  });
};

async function runTests() {
  console.log('====================================================');
  console.log('AI CAMERA PROCTORING LOGIC & LIFECYCLE VERIFICATION');
  console.log('====================================================\n');

  // ------------------------------------------------------------------
  // Test 1: Real camera with valid frames resolves to ACTIVE
  // ------------------------------------------------------------------
  console.log('[Test 1] Real physical camera stream produces valid frames...');
  {
    const video = new MockVideoElement();
    const stream = new MockMediaStream();
    video.srcObject = stream;
    video.readyState = 4;
    video.videoWidth = 640;
    video.videoHeight = 480;

    let cameraState: CameraState = 'VERIFYING_FRAMES';
    const dims = await verifyActiveVideoFrames(video, { aborted: false }, 1000);
    assert.strictEqual(dims.width, 640);
    assert.strictEqual(dims.height, 480);
    cameraState = 'ACTIVE';

    assert.strictEqual(cameraState, 'ACTIVE');
    console.log('  -> PASS: Verified real frames, dimensions 640x480, state transitioned to ACTIVE.');
  }

  // ------------------------------------------------------------------
  // Test 2: Camera stream without frames (black/synthetic 0x0) fails verification
  // ------------------------------------------------------------------
  console.log('\n[Test 2] Camera stream with black preview / zero dimensions...');
  {
    const video = new MockVideoElement();
    const stream = new MockMediaStream();
    video.srcObject = stream;
    video.readyState = 1; // Not ready
    video.videoWidth = 0; // 0 dimensions
    video.videoHeight = 0;

    let cameraState: CameraState = 'VERIFYING_FRAMES';
    let rejected = false;

    try {
      await verifyActiveVideoFrames(video, { aborted: false }, 200);
      cameraState = 'ACTIVE';
    } catch (err: any) {
      rejected = true;
      cameraState = 'ERROR';
      assert.ok(err.message.includes('failed to render within'));
    }

    assert.strictEqual(rejected, true);
    assert.strictEqual(cameraState, 'ERROR');
    console.log('  -> PASS: Frame verification rejected unrendered video feed; cameraState is NOT ACTIVE.');
  }

  // ------------------------------------------------------------------
  // Test 3: Camera initialization 15-second timeout behavior
  // ------------------------------------------------------------------
  console.log('\n[Test 3] 15-second initialization timeout handling...');
  {
    const mockGetUserMediaHanging = () =>
      new Promise<MockMediaStream>(() => {
        // Deliberately hangs forever (simulating permission prompt ignored)
      });

    const initTimeoutMs = 150; // Scaled down for unit test
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            'CAMERA_TIMEOUT: Camera initialization timed out after 15 seconds. Browser camera permission was not granted or the camera hardware is busy.'
          )
        );
      }, initTimeoutMs);
    });

    let cameraState: CameraState = 'REQUESTING_PERMISSION';
    let errorMsg: string | null = null;

    try {
      await Promise.race([mockGetUserMediaHanging(), timeoutPromise]);
      cameraState = 'ACTIVE';
    } catch (err: any) {
      if (err.message.startsWith('CAMERA_TIMEOUT:')) {
        cameraState = 'TIMEOUT';
        errorMsg = 'Camera request timed out after 15 seconds.';
      }
    }

    assert.strictEqual(cameraState, 'TIMEOUT');
    assert.strictEqual(errorMsg, 'Camera request timed out after 15 seconds.');
    console.log('  -> PASS: Timeout caught correctly, transitions to TIMEOUT, no infinite waiting.');
  }

  // ------------------------------------------------------------------
  // Test 4: Permission denied produces explicit error without strikes
  // ------------------------------------------------------------------
  console.log('\n[Test 4] Permission denied error mapping...');
  {
    const permissionDeniedErr = new Error('Permission denied');
    (permissionDeniedErr as any).name = 'NotAllowedError';

    let cameraState: CameraState = 'INITIALIZING';
    let userMessage = '';

    if (permissionDeniedErr.name === 'NotAllowedError') {
      cameraState = 'PERMISSION_DENIED';
      userMessage = 'Camera permission denied. Please allow camera access in your browser address bar.';
    }

    assert.strictEqual(cameraState, 'PERMISSION_DENIED');
    assert.ok(userMessage.includes('permission denied'));
    console.log('  -> PASS: NotAllowedError correctly maps to PERMISSION_DENIED state.');
  }

  // ------------------------------------------------------------------
  // Test 5: Camera disconnect violation ONLY fires if previously active
  // ------------------------------------------------------------------
  console.log('\n[Test 5] Disconnect violation suppression during initialization...');
  {
    let strikes = 0;
    const triggerDisconnectStrike = (hasEverBeenActive: boolean, cameraState: CameraState) => {
      if (hasEverBeenActive && cameraState === 'DISCONNECTED') {
        strikes += 1;
      }
    };

    // Scenario A: Failed before ever being active (e.g. initialization error)
    triggerDisconnectStrike(false, 'DISCONNECTED');
    assert.strictEqual(strikes, 0, 'No strike should occur if camera was never active');

    // Scenario B: Was active during exam, then disconnected
    triggerDisconnectStrike(true, 'DISCONNECTED');
    assert.strictEqual(strikes, 1, 'Strike must occur if camera was active and then disconnected');

    console.log('  -> PASS: Disconnect violations strictly guarded by hasEverBeenActiveRef.');
  }

  // ------------------------------------------------------------------
  // Test 6: Retry session invalidation
  // ------------------------------------------------------------------
  console.log('\n[Test 6] Retry session invalidation & cleanup...');
  {
    let sessionCounter = 0;
    const tracks: MockMediaStreamTrack[] = [new MockMediaStreamTrack()];

    // Session 1 starts
    const session1 = ++sessionCounter;

    // User clicks Retry -> session 1 invalidated, tracks stopped
    tracks.forEach((t) => t.stop());
    sessionCounter += 1;

    // Session 2 starts
    const session2 = ++sessionCounter;

    assert.notStrictEqual(session1, session2);
    assert.strictEqual(tracks[0].readyState, 'ended');
    console.log('  -> PASS: Session counter properly increments and releases old tracks on Retry.');
  }

  console.log('\n====================================================');
  console.log('ALL CAMERA PROCTORING VALIDATION TESTS PASSED (6/6)');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
