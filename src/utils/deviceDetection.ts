export interface DeviceInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  screenResolution: string;
  viewport: string;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: string;
  networkSpeed: string;
  batteryLevel?: number;
  isCharging?: boolean;
  cpuCores: number;
  memory: number;
  timestamp: string;
  timezone: string;
  language: string;
}

export async function detectDeviceInfo(): Promise<DeviceInfo> {
  const userAgent = navigator.userAgent;
  
  // Detect browser
  const browser = detectBrowser(userAgent);
  const browserVersion = detectBrowserVersion(userAgent);
  
  // Detect OS
  const { os, osVersion } = detectOS(userAgent);
  
  // Screen and viewport
  const screenResolution = `${window.screen.width}x${window.screen.height}`;
  const viewport = `${window.innerWidth}x${window.innerHeight}`;
  
  // Device type
  const deviceType = detectDeviceType(userAgent);
  
  // Network info
  const connection = (navigator as any).connection || 
                    (navigator as any).mozConnection || 
                    (navigator as any).webkitConnection;
  
  const connectionType = connection?.effectiveType || 'unknown';
  const networkSpeed = connection?.downlink ? `${connection.downlink} Mbps` : 'unknown';
  
  // Battery info (if supported)
  let batteryLevel: number | undefined;
  let isCharging: boolean | undefined;
  
  try {
    if ('getBattery' in navigator) {
      const battery = await (navigator as any).getBattery();
      batteryLevel = Math.round(battery.level * 100);
      isCharging = battery.charging;
    }
  } catch (e) {
    console.log('Battery API not supported');
  }
  
  // Hardware info
  const cpuCores = navigator.hardwareConcurrency || 0;
  const memory = (navigator as any).deviceMemory || 0;
  
  return {
    browser,
    browserVersion,
    os,
    osVersion,
    screenResolution,
    viewport,
    deviceType,
    connectionType,
    networkSpeed,
    batteryLevel,
    isCharging,
    cpuCores,
    memory,
    timestamp: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
  };
}

function detectBrowser(ua: string): string {
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Opera/') || ua.includes('OPR/')) return 'Opera';
  return 'Unknown';
}

function detectBrowserVersion(ua: string): string {
  const match = ua.match(/(Firefox|Edg|Chrome|Safari|Opera|OPR)\/(\d+\.\d+)/);
  return match ? match[2] : 'unknown';
}

function detectOS(ua: string): { os: string; osVersion: string } {
  if (ua.includes('Windows NT 10.0')) return { os: 'Windows', osVersion: '10/11' };
  if (ua.includes('Windows NT 6.3')) return { os: 'Windows', osVersion: '8.1' };
  if (ua.includes('Windows NT 6.2')) return { os: 'Windows', osVersion: '8' };
  if (ua.includes('Windows NT 6.1')) return { os: 'Windows', osVersion: '7' };
  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    const version = match ? match[1].replace('_', '.') : 'unknown';
    return { os: 'macOS', osVersion: version };
  }
  if (ua.includes('Android')) {
    const match = ua.match(/Android (\d+\.\d+)/);
    return { os: 'Android', osVersion: match ? match[1] : 'unknown' };
  }
  if (ua.includes('iPhone') || ua.includes('iPad')) {
    const match = ua.match(/OS (\d+_\d+)/);
    const version = match ? match[1].replace('_', '.') : 'unknown';
    return { os: 'iOS', osVersion: version };
  }
  if (ua.includes('Linux')) return { os: 'Linux', osVersion: 'unknown' };
  return { os: 'Unknown', osVersion: 'unknown' };
}

function detectDeviceType(ua: string): 'mobile' | 'tablet' | 'desktop' {
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export function getDevicePerformanceScore(): number {
  const cpuCores = navigator.hardwareConcurrency || 1;
  const memory = (navigator as any).deviceMemory || 2;
  
  // Simple scoring: CPU cores (40%) + Memory (40%) + Device Type (20%)
  const cpuScore = Math.min(cpuCores / 8, 1) * 40;
  const memoryScore = Math.min(memory / 8, 1) * 40;
  const deviceTypeScore = window.innerWidth >= 1024 ? 20 : window.innerWidth >= 768 ? 15 : 10;
  
  return Math.round(cpuScore + memoryScore + deviceTypeScore);
}
