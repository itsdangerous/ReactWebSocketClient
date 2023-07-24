import { Client } from '@stomp/stompjs';
import React, { useEffect, useRef } from 'react';

const App = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const clientRef = useRef(null); // 웹소켓 클라이언트를 useRef로 저장
  const isWebSocketConnected = useRef(false);

  const connectWebSocket = () => {
    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      connectHeaders: {
        username: '1234',
        password: '1234',
        'heart-beat': '10000,10000', // Heartbeat 메시지 주기 설정
      },
      debug: function (str) {
        // console.log('[WebSocket Debug]', str); // 웹소켓 디버깅 로그 추가
      },
    });

    client.activate();

    client.onConnect = (frame) => {
      isWebSocketConnected.current = true;
      clientRef.current = client; // 연결에 성공한 웹소켓 클라이언트를 저장
      console.log('WebSocket 연결 성공');

      client.subscribe('/topic/analyzingData', (message) => {
        console.log('서버로부터 메시지 수신:', message.body);
      });

      startWebcamCapture();
    };

    client.onStompError = (frame) => {
      isWebSocketConnected.current = false;
      console.log('WebSocket 연결 실패:', frame.headers['message']);
    };
  };

  const startWebcamCapture = () => {
    const captureInterval = 1000;

    const captureImage = async () => {
      if (videoRef.current && canvasRef.current) {
        const videoElement = videoRef.current;
        const canvasElement = canvasRef.current;
         // 캔버스의 크기를 조정하여 해상도를 낮춤
      canvasElement.width = videoElement.videoWidth / 8;
      canvasElement.height = videoElement.videoHeight / 8;
        const context = canvasElement.getContext('2d');
        context.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

        canvasElement.toBlob((blob) => {
        const reader = new FileReader();
        reader.onloadend = function() {
          const base64data = reader.result;
          if (isWebSocketConnected.current) {
            clientRef.current.publish({ destination: '/app/imageData', body: base64data });
            // console.log(base64data);
            console.log("/app/imageData uri로 이미지 데이터 전송했음.");
          } else {
            console.log("웹소켓 연결이 끊겨서 이미지를 전송할 수 없습니다.");
          }
        }
        reader.readAsDataURL(blob);
      }, 'image/png');
      }
    };

    setInterval(() => {
      if (isWebSocketConnected.current) {
        captureImage();
      } else {
        connectWebSocket();
      }
    }, captureInterval);
  };

  useEffect(() => {
    connectWebSocket();
  }, []);

  useEffect(() => {
    const startWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error('웹캠 스트림을 가져오는 중 오류가 발생했습니다:', error);
      }
    };

    startWebcam();
  }, []);

  return (
    <div>
      <h1>WebSocket and Webcam Example</h1>
      <video ref={videoRef} width="640" height="480" autoPlay muted></video>
      <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480"></canvas>
    </div>
  );
};

export default App;
