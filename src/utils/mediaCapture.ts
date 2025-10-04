// Media capture utilities for test reports

export interface CapturedMedia {
  screenshot?: string; // Base64 data URL
  video?: string; // Base64 data URL
  trace?: string; // File path or data
}

export async function captureScreenshot(): Promise<string> {
  try {
    // In a real implementation, this would capture the actual page screenshot
    // For now, we'll create a mock screenshot with canvas
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a mock screenshot with test information
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 800, 600);
      
      // Add a border
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, 798, 598);
      
      // Add title
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Test Screenshot', 400, 50);
      
      // Add timestamp
      ctx.font = '14px Arial';
      ctx.fillStyle = '#64748b';
      ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 400, 80);
      
      // Add mock page content
      ctx.fillStyle = '#374151';
      ctx.font = '16px Arial';
      ctx.textAlign = 'left';
      ctx.fillText('Mock Test Page Content', 50, 150);
      ctx.fillText('• Element interactions', 50, 180);
      ctx.fillText('• Form submissions', 50, 210);
      ctx.fillText('• Navigation steps', 50, 240);
      
      // Add status indicator
      ctx.fillStyle = '#10b981';
      ctx.fillRect(50, 300, 20, 20);
      ctx.fillStyle = '#1e293b';
      ctx.font = '14px Arial';
      ctx.fillText('Test Status: PASSED', 80, 315);
    }
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    return createPlaceholderScreenshot();
  }
}

export async function generateMockVideo(): Promise<string> {
  try {
    // Create a simple animated video using canvas
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Create a simple animation frame
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 640, 480);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Test Video Recording', 320, 240);
      
      ctx.font = '14px Arial';
      ctx.fillText(`Duration: ${(Math.random() * 5 + 1).toFixed(1)}s`, 320, 270);
    }
    
    return canvas.toDataURL('image/png'); // For now, return as image
  } catch (error) {
    console.error('Failed to generate video:', error);
    return createPlaceholderVideo();
  }
}

export function createPlaceholderScreenshot(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('📸 Screenshot Placeholder', 200, 150);
  }
  
  return canvas.toDataURL('image/png');
}

export function createPlaceholderVideo(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 300;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, 400, 300);
    
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🎥 Video Placeholder', 200, 150);
  }
  
  return canvas.toDataURL('image/png');
}

export async function captureTestMedia(testName: string): Promise<CapturedMedia> {
  const media: CapturedMedia = {};
  
  try {
    // Capture screenshot
    media.screenshot = await captureScreenshot();
    
    // Generate mock video (in real implementation, this would be actual video recording)
    media.video = await generateMockVideo();
    
    // Generate trace file path
    media.trace = `traces/${testName.replace(/\s+/g, '-').toLowerCase()}-trace.zip`;
    
    return media;
  } catch (error) {
    console.error('Failed to capture test media:', error);
    return {
      screenshot: createPlaceholderScreenshot(),
      video: createPlaceholderVideo(),
      trace: `traces/${testName.replace(/\s+/g, '-').toLowerCase()}-trace.zip`
    };
  }
}
