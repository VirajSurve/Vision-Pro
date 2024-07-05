import { useEffect, useRef, useState } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import "./Camera.css";

// const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI("AIzaSyD2JwFzqCf9bzMtm2TsdZzrd2_td-RW6CE");

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-pro",
  systemInstruction: "You are an image assistant.",
});

const Camera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const bottomBarRef = useRef(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [ans, setAns] = useState("");
  const [buttonColor, setButtonColor] = useState('white');
  const [isVideoStreamActive, setVideoStreamActive] = useState(true);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let currentVideoRef = videoRef.current;

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
          if (currentVideoRef) {
            currentVideoRef.srcObject = stream;
          }
        } else {
          if (currentVideoRef && currentVideoRef.srcObject) {
            const tracks = currentVideoRef.srcObject.getTracks();
            tracks.forEach(track => track.stop());
          }
        }
      } catch (error) {
        console.error("Error accessing the camera: ", error);
      }
    };

    getCameraFeed();

    return () => {
      if (currentVideoRef && currentVideoRef.srcObject) {
        const tracks = currentVideoRef.srcObject.getTracks();
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
      // Stop the video stream first
      setVideoStreamActive(false);

      const canvas = canvasRef.current;
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      // Convert canvas content to base64 data URL
      const base64Image = canvas.toDataURL('image/jpeg');
      console.log('Base64 image:', base64Image);

      // Create an object with the specified format
      const image = {
        inlineData: {
          data: base64Image.split(',')[1], // Extract base64 data part
          mimeType: 'image/png',
        }
      };
      setCapturedImage(image);
      console.log('Image object:', image);

      const result = await model.generateContent([image]);
      console.log(result.response.text());
      setAns(result.response.text());
    }
  };

  const handleCaptureClick = () => {
    setButtonColor("grey"); // Change button color when clicked
    captureImage();
  };

  const handleSend = async () => {
    var userText = input;
    setInput("");
    setMessages([...messages, { txt: userText, isBot: false }]);

    if (capturedImage) {
      const result = await model.generateContent([userText, capturedImage]);
      setMessages([...messages,  { txt: userText, isBot: false }, { txt: result.response.text(), isBot: true }]);
      console.log("result: ", result.response.text());
    } else {
      console.error("Captured image is null.");
    }
  };

  const handleBottomBarDrag = (event) => {
    const bottomBar = bottomBarRef.current;
    if (bottomBar) {
      bottomBar.style.transition="drag"; // Disable transition during drag
      let startY = event.clientY || event.touches[0].clientY;
      let diffY = 0;

      const onMouseMove = (e) => {
        diffY = (e.clientY || e.touches[0].clientY) - startY;
        // bottomBar.style.transform = `translateY(${Math.min(0, diffY)}px)`;
      };

      const onMouseUp = () => {
        bottomBar.style.transition = "transform 0.5s ease-in-out"; // Re-enable transition
        bottomBar.style.transform = diffY < -50 ? "translateY(0)" : "translateY(95%)"; // Adjust based on drag distance
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

  return (
    <div>
      <div className='videoScreen'>
        <video ref={videoRef} autoPlay playsInline style={{ display: isVideoStreamActive ? 'block' : 'none' }} />
        <canvas ref={canvasRef} style={{ display: !isVideoStreamActive ? 'block' : 'none' }} />
      </div>
      
      <div>
        <button className='captureButton' onClick={handleCaptureClick} style={{ backgroundColor: buttonColor }}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-full p-2">
            <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813A3.75 3.75 0 0 0 7.466 7.89l.813-2.846A.75.75 0 0 1 9 4.5ZM18 1.5a.75.75 0 0 1 .728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 0 1 0 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 0 1-1.456 0l-.258-1.036a2.625 2.625 0 0 0-1.91-1.91l-1.036-.258a.75.75 0 0 1 0-1.456l1.036-.258a2.625 2.625 0 0 0 1.91-1.91l.258-1.036A.75.75 0 0 1 18 1.5ZM16.5 15a.75.75 0 0 1 .712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 0 1 0 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 0 1-1.422 0l-.395-1.183a1.5 1.5 0 0 0-.948-.948l-1.183-.395a.75.75 0 0 1 0-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0 1 16.5 15Z" clipRule="evenodd" />
          </svg>
        </button>
        <div className='relative bottomBar' ref={bottomBarRef} >
          <div className='bar flex justify-center'  onMouseDown={handleBottomBarDrag}
          onTouchStart={handleBottomBarDrag} >
           <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-12 w-48 h-10">
           <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
           </svg>
           </div>
          <div className='result px-3 py-2 '><ReactMarkdown>{ans}</ReactMarkdown></div>
          <div className='chat flex flex-col mt-0 overflow-y-auto max-h-lvh scrollBar-width-0'>
          {
            messages.map((message,i)=>(
              <div key={i} className={message.isBot?"chatbot bg-red-500 rounded-2xl w-fit mr-auto":"chatbot bg-blue-500 rounded-2xl w-fit ml-auto"}>
              <p className='text'><ReactMarkdown>{message.txt}</ReactMarkdown></p>
              </div>
            ))
          }
          <div className='pb-80'>
          </div>
          </div>
          
          <div className='fixed flex bg-red-500 searchBar bottom-5 w-full px-4'>
            <input
              className='search bg-gray-200 px-2 py-5 rounded-full w-full'
              type='text'
              placeholder='Enter something...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
            <button className='sendbtn bg-gray-200 px-4 rounded-full ml-2' onClick={handleSend}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-8">
                <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Camera;