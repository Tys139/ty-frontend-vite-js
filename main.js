import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger.js";
import axios from 'axios';
gsap.registerPlugin(ScrollTrigger);



let apiLink=`https://ty-backend.shuttleapp.rs`
//let apiLink=`http://127.0.0.1:8000`

// Function to use the token for subsequent calls
function getAuthorizationHeader() {
  return { Authorization: `Bearer ${jwtToken}` };
}



function createScene(canvas, color) {
    const scene = new THREE.Scene();
    //const camera = new THREE.PerspectiveCamera(500, 1, canvas1.width/ canvas1.height, 1000);
    console.log(canvas1.width / canvas1.height)
    const aspectRatio = 2.01;
    const frustumSize = 60; 
    const camera = new THREE.OrthographicCamera(
        -frustumSize * aspectRatio / 2,  // Left
        frustumSize * aspectRatio / 2,   // Right
        frustumSize / 2,                  // Top
        -frustumSize / 2,                 // Bottom
        0.1,                              // Near clipping plane
        1000                              // Far clipping plane
    );
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, });

    renderer.setSize(window.innerWidth, window.innerHeight);

    camera.position.z = 10;

    //const controls = new OrbitControls(camera, renderer.domElement);
    //controls.enableDamping = true;
   // controls.dampingFactor = 0.05;
   // controls.update();

    const ambientLight = new THREE.AmbientLight(0xadd8e6, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    scene.add(directionalLight);

    return { scene, camera, renderer };
}

const canvas1 = document.getElementById('canvas1');
const { scene: scene1, camera: camera1, renderer: renderer1 } = createScene(canvas1, 0x000000);

//const canvas2 = document.getElementById('canvas2');
//const { scene: scene2, camera: camera2, renderer: renderer2 } = createScene(canvas2, 0xFF0000);

///const canvas3 = document.getElementById('canvas3');
//const { scene: scene3, camera: camera3, renderer: renderer3 } = createScene(canvas3, 0x00FF00);

function createCube(scene, color) {
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial({ color: color });
    const cube = new THREE.Mesh(geometry, material);
    cube.scale.set(2, 2, 2);
    scene.add(cube);
    return cube;
}

const vertexShader3 = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader3 = `
  uniform float iTime;
  uniform vec2 iResolution;
  varying vec2 vUv;

  const float overallSpeed = 0.2;
  const float gridSmoothWidth = 0.015;
  const float axisWidth = 0.05;
  const float majorLineWidth = 0.025;
  const float minorLineWidth = 0.0125;
  const float majorLineFrequency = 5.0;
  const float minorLineFrequency = 2.0;
  const vec4 gridColor = vec4(0.5);
  const float scale = 5.0;
  const vec4 lineColor = vec4(0.25, 0.5, 1.0, 1.0);
  const float minLineWidth = 0.02;
  const float maxLineWidth = 0.3;
  const float lineSpeed = 1.0 * overallSpeed;
  const float lineAmplitude = 1.0;
  const float lineFrequency = 0.2;
  const float warpSpeed = 0.2 * overallSpeed;
  const float warpFrequency = 0.5;
  const float warpAmplitude = 1.0;
  const float offsetFrequency = 0.5;
  const float offsetSpeed = 1.33 * overallSpeed;
  const float minOffsetSpread = 0.6;
  const float maxOffsetSpread = 2.0;
  const int linesPerGroup = 10;

  const vec4 bgColor1 = lineColor * 0.1;
  const vec4 bgColor2 = lineColor - vec4(1.0, 1.0, 1.0, 1.0);

  float drawCircle(vec2 pos, float radius, vec2 coord) {
    return smoothstep(radius + gridSmoothWidth, radius, length(coord - pos));
  }

  float drawSmoothLine(float pos, float halfWidth, float t) {
    return smoothstep(halfWidth, 0.0, abs(pos - t));
  }

  float drawCrispLine(float pos, float halfWidth, float t) {
    return smoothstep(halfWidth + gridSmoothWidth, halfWidth, abs(pos - t));
  }

  float drawPeriodicLine(float freq, float width, float t) {
    return drawCrispLine(freq / 2.0, width, abs(mod(t, freq) - freq / 2.0));
  }

  float drawGridLines(float axis) {
    return drawCrispLine(0.0, axisWidth, axis)
         + drawPeriodicLine(majorLineFrequency, majorLineWidth, axis)
         + drawPeriodicLine(minorLineFrequency, minorLineWidth, axis);
  }

  float drawGrid(vec2 space) {
    return min(1.0, drawGridLines(space.x) + drawGridLines(space.y));
  }

  float random(float t) {
    return (cos(t) + cos(t * 1.3 + 1.3) + cos(t * 1.4 + 1.4)) / 3.0;
  }

  float getPlasmaY(float x, float horizontalFade, float offset) {
    return random(x * lineFrequency + iTime * lineSpeed) * horizontalFade * lineAmplitude + offset;
  }

  void main() {
    vec2 fragCoord = vUv * iResolution;
    vec2 space = (fragCoord - iResolution.xy / 2.0) / iResolution.x * 2.0 * scale;
    
    float horizontalFade = 1.0 - (cos(vUv.x * 6.28) * 0.5 + 0.5);
    float verticalFade = 1.0 - (cos(vUv.y * 6.28) * 0.5 + 0.5);

    space.y += random(space.x * warpFrequency + iTime * warpSpeed) * warpAmplitude * (0.5 + horizontalFade);
    space.x += random(space.y * warpFrequency + iTime * warpSpeed + 2.0) * warpAmplitude * horizontalFade;
    
    vec4 lines = vec4(0.0);
    
    for(int l = 0; l < linesPerGroup; l++) {
      float normalizedLineIndex = float(l) / float(linesPerGroup);
      float offsetTime = iTime * offsetSpeed;
      float offsetPosition = float(l) + space.x * offsetFrequency;
      float rand = random(offsetPosition + offsetTime) * 0.5 + 0.5;
      float halfWidth = mix(minLineWidth, maxLineWidth, rand * horizontalFade) / 2.0;
      float offset = random(offsetPosition + offsetTime * (1.0 + normalizedLineIndex)) * mix(minOffsetSpread, maxOffsetSpread, horizontalFade);
      float linePosition = getPlasmaY(space.x, horizontalFade, offset);
      float line = drawSmoothLine(linePosition, halfWidth, space.y) / 2.0 + drawCrispLine(linePosition, halfWidth * 0.15, space.y);
      
      float circleX = mod(float(l) + iTime * lineSpeed, 25.0) - 12.0;
      vec2 circlePosition = vec2(circleX, getPlasmaY(circleX, horizontalFade, offset));
      float circle = drawCircle(circlePosition, 0.01, space) * 4.0;
      
      line = line + circle;
      lines += line * lineColor * rand;
    }
    
    vec4 fragColor = mix(bgColor1, bgColor2, vUv.x);
    fragColor *= verticalFade;
    fragColor.a = 1.0;
    fragColor += lines;

    gl_FragColor = fragColor;
  }
`;

const uniforms = {
  iTime: { value: 0.0 },
  iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const material3 = new THREE.ShaderMaterial({
  vertexShader: vertexShader3,
  fragmentShader: fragmentShader3,
  uniforms,
  side: THREE.DoubleSide,
  transparent: false
});

const geometry3 = new THREE.PlaneGeometry(100, 100);
let mesh3 = new THREE.Mesh(geometry3, material3);
mesh3.position.z = -100;
mesh3.position.x = -10;

scene1.add(mesh3);

const loader = new FontLoader();
loader.load('ty_font.json', function (font) {
    const textGeometry = new TextGeometry('tathagat yash', {
        font: font,
        size: 8,
        height: 5,
        curveSegments: 5
    });
    const textMaterial = new THREE.MeshPhysicalMaterial({
        roughness: .5,   
        transmission: 1,  
        thickness: .5// 
    });
    let textMesh = new THREE.Mesh(textGeometry, textMaterial);
    textGeometry.center();
    scene1.add(textMesh);
    textMesh.position.set(-21, 5, -100);
    //console.log(textMaterial);
});

//onst cube2 = createCube(scene2, 0xFFFF00);
//const cube3 = createCube(scene3, 0x00FFFF);

function animate() {
    requestAnimationFrame(animate);
    material3.uniforms.iTime.value += 0.005;

    //cube2.rotation.x += 0.01;
    //cube2.rotation.y += 0.01;

    //cube3.rotation.x += 0.01;
   //cube3.rotation.y += 0.01;

    renderer1.render(scene1, camera1);
   // renderer2.render(scene2, camera2);
    //renderer3.render(scene3, camera3);
}
animate();

const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "body",
        start: "top top",
        end: "bottom bottom",
        scrub: true
    }
});

tl.to("#canvas1-wrapper", { x: -1080, duration:20, ease: "circ.out" })
  .to("#scroll-text", { y: 40, duration: 10, ease: "circ.out" })
  .to("#canvas2-wrapper", { x: 1200, duration: 30, ease: "circ.out" })
  .to("#canvas2-wrapper", { y: 40, duration:10, ease: "circ.out" })
  .to("#canvas3-wrapper", { y: -20, duration: 10, ease: "circ.out" })
  //.to("#canvas1-wrapper", { x: -1200, duration: 30, ease: "circ.out" })
  //.to("#canvas2-wrapper", { y: 1300, duration:10, ease: "circ.out" })
  .to("#canvas3-wrapper", { y: -600, duration: 10, ease: "circ.out" })
  .to("#canvas4-wrapper", { y: -50, duration: 10, ease: "circ.out" })
  const canvasWrappers = document.querySelectorAll('.canvas-wrapper:not(#canvas4-wrapper)');
  //const canvasWrappers = document.querySelectorAll('.canvas-wrapper');
  canvasWrappers.forEach(wrapper => {
      wrapper.addEventListener('mouseenter', () => {  
        console.log(wrapper);
          gsap.to(wrapper, { rotationX: 10, rotationY: 10, duration: 0.3, ease: "power1.inOut" });
      });

      wrapper.addEventListener('mouseleave', () => {
          gsap.to(wrapper, { rotationX: 0, rotationY: 0, duration: 0.3, ease: "power1.inOut" });
      });
  });

function updateDimensions() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    return { width, height };
}

// Update dimensions on load and on resize
updateDimensions();

window.addEventListener('resize', () => {
    const { width, height } = updateDimensions();
    // You can use the updated dimensions here if needed
});

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}
const characterSelect = document.getElementById('character-select');
const chatMessages = document.querySelector('.chat-messages');
const userInput = document.querySelector('.chat-input textarea');
const sendButton = document.querySelector('.chat-input button');
function addMessage(content, isUser = false) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  
  const text = document.createElement('p');
  text.textContent = content;
  
  messageDiv.appendChild(text);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to the bottom of the chat
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function getAIResponse(userMessage) {
  const apiUrl = apiLink+'/goodgodzilla'; // Replace with your actual API URL
  // Replace with your actual JWT token

  const data = {
    role: "user",
    content: userMessage,
    model: characterSelect.value// Assuming characterSelect is your dropdown element
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        role: "user",
        content: userMessage,
        model: characterSelect.value// Assuming characterSelect is your dropdown element
      })
    });

    // if (!response.ok) {
    //   throw new Error('Network response was not ok');
    // }
    
    const responseData = await response.json();
    console.log(responseData)
    // Assuming the API returns the assistant's message in the 'content' field
    // of the first choice in the 'choices' array
    return responseData.messages[0];
  } catch (error) {
    console.error('Error:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

sendButton.addEventListener('click', async () => {
  const userMessage = userInput.value.trim();
  if (userMessage) {
      addMessage(userMessage, true);
      userInput.value = '';
      console.log(userMessage)
      try {
          const aiResponse = await getAIResponse(userMessage);
          addMessage(aiResponse);
      } catch (error) {
          console.error('Error:', error);
          addMessage('Sorry, I encountered an error. Please try again.');
      }
  }
});

userInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendButton.click();
  }
});

let cLocation;
async function getLocationInfo() {
  try {
    // Get IP address
    const ipResponse = await axios.get('https://api.ipify.org?format=json');
    const ip = ipResponse.data.ip;

    // Get location information using the IP
    //const locationResponse = await axios.get(apiLink+`/get_location_endpoint/${ip}`);
    const locationResponse = await axios.get(apiLink+`/location/${ip}`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    });


     cLocation = locationResponse.data;
    console.log()
    console.log('Location Data:', cLocation);
    console.log(typeof cLocation);
    console.log('Location Data 2 :', apiLink+`/get_location_endpoint/${ip}`);

    // You can use the locationData here to update your UI or perform other actions
  } catch (error) {
    console.error('Error fetching location information:', error);
  }
}

// Call the function when the page loads

// Call the function when the page loads

window.addEventListener('load', getLocationInfo);



let jwtToken = null;

async function getJwtToken() {
  try {
    const response = await axios.get(apiLink+'/get_token');
    jwtToken = response.data.token;
    console.log('JWT Token retrieved successfully');
    console.log(jwtToken)
  } catch (error) {
    console.error('Error retrieving JWT token:', error);
  }
}

async function getCharacters() {

    try {
      const response = await axios.get(apiLink+'/goodgodzillamodels', {
        headers: {
          Authorization: `Bearer ${jwtToken}`
        }
      });
      console.log(response.data.models[0].id)
      if (cLocation) {
        await getFunFactAboutLocation('llama3-8b-8192'); // Using the first character as default
      }
      return response.data.models; // Return the models array
    } catch (error) {
      console.error('Error fetching characters:', error);
      return [];
    }}
  
    
    function addMessageToChat(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `message ${role}`;
      const p = document.createElement('p');
      p.textContent = content;
      messageDiv.appendChild(p);
      chatMessages.appendChild(messageDiv);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

async function getFunFactAboutLocation(model) {
  try {
    const payload = {
      role: "user",
      content: `tell me a fun fact about user location and weather ${JSON.stringify(cLocation)}`,
      model: model
    };

 const response = await axios.post(apiLink+'/goodgodzilla', payload, {
      headers: {
       Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
       }
 });


   
    // Handle the response
    const funFact = response.data.messages[0]; // Adjust this based on the actual response structure
    console.log("funFact")
    console.log(funFact)
    addMessageToChat('assistant', funFact);
  } catch (error) {
    console.error('Error fetching fun fact:', error);
    addMessageToChat('assistant', 'Sorry, I couldn\'t fetch a fun fact about your location at the moment.');
  }
}




const startButton = document.getElementById('start-button');
// Modify the start button click event listener
// startButton.addEventListener('click', async function() {
//   if (startButton.textContent === 'Start') {
//     const characters = await getCharacters();
    
//     // Populate dropdown with fetched characters
//     characterSelect.innerHTML = '<option value="">Select a character</option>';
//     characters.forEach(char => {
//       const option = document.createElement('option');
//       option.value = char;
//       option.textContent = char;
//       characterSelect.appendChild(option);
//     });
    
//     // Select a random character
//     const randomIndex = Math.floor(Math.random() * characters.length);
//     characterSelect.selectedIndex = randomIndex + 1; // +1 because of the initial empty option
    
//     // Change button text to "Send"
//     startButton.textContent = '🦖Send 🦖';
//   } else {
//     // Handle sending message (existing code)
//   }
// });


document.addEventListener('DOMContentLoaded', async function() {
  

  await getJwtToken();

  startButton.addEventListener('click', async function() {
    if (startButton.textContent === 'Start') {
      // Fetch characters from the API
      const characters = await getCharacters();
      console.log("test")
      console.log(characters)
      // Populate dropdown with fetched characters
      characterSelect.innerHTML = '<option value="">Select a character</option>';
      characters.forEach(char => {
        const option = document.createElement('option');
        option.value = char.id; // Set the value to the model's id
        option.textContent = char.id; // Display the model's id as the text
        characterSelect.appendChild(option);
      });
      
 // Set llama3-8b-8192 as the default character
 const defaultCharacter = 'llama3-8b-8192';
 const defaultOption = Array.from(characterSelect.options).find(option => option.value === defaultCharacter);
 if (defaultOption) {
   characterSelect.value = defaultCharacter; // Set the dropdown to the default character
 }        userInput.disabled = false;
          userInput.placeholder='Enter your message..'
      // Change button text to "Send"
      startButton.textContent = '🦖Send 🦖';
    } else {
      // Handle sending message
      const message = userInput.value.trim();
      if (message) {
        sendMessage(message);
        userInput.value = '';
      }
    }
  });

  async function sendMessage(content) {
    // Add user message to chat
    addMessageToChat('user', content);
console.log(characterSelect.value)
    // Prepare payload
    const payload = {
      role: "user",
      content: content,
      model : characterSelect.value
    };

    try {
      // Send request to endpoint
      const response = await axios.post(apiLink+'/goodgodzillamodels', payload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`
        }
      });

      // Add assistant's response to chat
      addMessageToChat('assistant', response.data.response);
    } catch (error) {
      console.error('Error:', error);
      addMessageToChat('assistant', 'Sorry, there was an error processing your request.');
    }
  }


});