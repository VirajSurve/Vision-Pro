import { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import "./Camera.css";

const genAI = new GoogleGenerativeAI("AIzaSyD2JwFzqCf9bzMtm2TsdZzrd2_td-RW6CE");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction: "You are an creative image assistant.Whenever the I send you an image summerize it in short ark the user for more options. Be friendly with the user and try to end the conversations with an emoji",
});

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ans, setAns] = useState(null);
  const [buttonColor, setButtonColor] = useState('white');
  const [isVideoStreamActive, setVideoStreamActive] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const getCameraFeed = async () => {
      try {
        if (isVideoStreamActive) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: window.innerWidth >= 768 ? "user" : "environment",
              width: { ideal: 1920 },
              height: { ideal: 1080 },
              frameRate: { ideal: 30, max: 60 }
            }
          });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } else {
          if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
          }
        }
      } catch (error) {
        console.error("Error accessing the camera: ", error);
      }
    };

    getCameraFeed();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, [isVideoStreamActive]);

  useEffect(() => {
    const bottomBar = bottomBarRef.current;
    if (bottomBar) {
      bottomBar.style.transition = "transform 0.5s ease-in-out";
      bottomBar.style.transform = ans ? "translateY(0)" : "translateY(100%)";
    }
  }, [ans]);

  const captureImage = async () => {
    if (videoRef.current && canvasRef.current) {
      setVideoStreamActive(false);

      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const base64Image = canvas.toDataURL('image/jpeg');
      console.log('Base64 image:', base64Image);

      const image = {
        inlineData: {
          data: base64Image.split(',')[1],
          mimeType: 'image/png',
        }
      };
      setCapturedImage(image);
      console.log('Image object:', image);

      const result = await model.generateContent([image]);
      console.log(result.response.text());
      setAns(result.response.text());
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', parts: [{ fileData: { mimeType: image.mimeType, fileUri: base64Image }, text: 'User captured an image' }] },
        { role: 'model', parts: [{ text: result.response.text() }] },
      ]);
    }
  };

  const handleCaptureClick = () => {
    if (ans) {
      window.location.reload(true);
    }
    setButtonColor("grey");
    captureImage();
    setTimeout(() => {
      setButtonColor("white");
    }, 2000);
  };

  const handleSend = async () => {
    const userText = input;
    setInput("");
    setMessages([...messages, { txt: userText, isBot: false }]);

    if (capturedImage) {
      const result = await model.generateContent([userText, capturedImage]);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'user', parts: [{ text: userText }] },
        { role: 'model', parts: [{ text: result.response.text() }] },
      ]);
      console.log("result: ", result.response.text());
    } else {
      console.error("Captured image is null.");
    }
  };

  const handleBottomBarDrag = (event) => {
    const bottomBar = bottomBarRef.current;
    if (bottomBar) {
      bottomBar.style.transition = "none";
      const startY = event.clientY || event.touches[0].clientY;
      let diffY = 0;

      const onMouseMove = (e) => {
        diffY = (e.clientY || e.touches[0].clientY) - startY;
      };

      const onMouseUp = () => {
        bottomBar.style.transition = "transform 0.5s ease-in-out";
        bottomBar.style.transform = diffY < -50 ? "translateY(0)" : "translateY(95%)";
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.removeEventListener('touchmove', onMouseMove);
        document.removeEventListener('touchend', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      document.addEventListener('touchmove', onMouseMove);
      document.addEventListener('touchend', onMouseUp);
    }
  };

  const handleEnter = async (e) => {
    if (e.key === "Enter") await handleSend();
  };

  return (
    <div>
      <div className='videoScreen'>
        <video ref={videoRef} autoPlay playsInline style={{ display: isVideoStreamActive ? 'block' : 'none' }} />
        <canvas ref={canvasRef} style={{ display: !isVideoStreamActive ? 'block' : 'none' }} />
      </div>

      <div>
        <button className='captureButton' onClick={handleCaptureClick} style={{ backgroundColor: buttonColor }}>
          {!ans && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full p-2">
              <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395a1.875 1.875 0 0 0-.948.948l-.394 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.875 1.875 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
            </svg>
          )}
          {ans && "Retake"}
        </button>
      </div>

      <div ref={bottomBarRef} className="bottom-bar" onMouseDown={handleBottomBarDrag} onTouchStart={handleBottomBarDrag}>
        {ans && (
          <>
            <div className="messages">
              {messages.map((message, index) => (
                <div key={index} className={`message ${message.role}`}>
                  {message.role === "user" && message.parts[0].fileData ? (
                    <img
                      src={`data:${message.parts[0].fileData.mimeType};base64,${message.parts[0].fileData.fileUri.split(',')[1]}`}
                      alt="Captured"
                    />
                  ) : null}
                  <ReactMarkdown>{message.parts[0].text}</ReactMarkdown>
                </div>
              ))}
            </div>

            <div className="inputArea">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleEnter}
                placeholder="Send a message"
                className="inputField"
              />
              <button onClick={handleSend} className="sendButton">Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Camera;
