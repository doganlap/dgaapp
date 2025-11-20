// AI Service Configuration and Status Management
class AIService {
  constructor() {
    this.baseUrl = 'http://localhost:11434'; // Ollama default port
    this.isConnected = false;
    this.connectionStatus = 'disconnected';
    this.agents = [];
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  async checkConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        timeout: 5000
      });
      
      if (response.ok) {
        this.isConnected = true;
        this.connectionStatus = 'connected';
        this.retryCount = 0;
        console.log('✅ AI Service connected successfully');
        return true;
      }
    } catch (error) {
      this.isConnected = false;
      this.connectionStatus = 'disconnected';
      console.log('🔌 AI Service not available:', error.message);
      return false;
    }
  }

  async getAgents() {
    if (!this.isConnected) {
      await this.checkConnection();
    }

    if (!this.isConnected) {
      throw new Error('AI service connection failed');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agents`);
      const data = await response.json();
      this.agents = data.agents || [];
      return this.agents;
    } catch (error) {
      console.error('Failed to fetch AI agents:', error);
      return this.getFallbackAgents();
    }
  }

  // Removed fallback agents - now throws error if AI service unavailable

  async startAgent(agentId) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/start`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      console.error(`Failed to start agent ${agentId}:`, error);
      throw error;
    }
  }

  async stopAgent(agentId) {
    if (!this.isConnected) {
      throw new Error('AI service not connected');
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/agents/${agentId}/stop`, {
        method: 'POST'
      });
      return await response.json();
    } catch (error) {
      console.error(`Failed to stop agent ${agentId}:`, error);
      throw error;
    }
  }

  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      status: this.connectionStatus,
      message: this.isConnected 
        ? 'AI service is running' 
        : '⚠️ العامل غير متصل بخدمة ذكاء اصطناعي. يرجى التحقق من إعدادات الخدمة.',
      messageEn: this.isConnected 
        ? 'AI service is running' 
        : '⚠️ Agent not connected to AI service. Please check service configuration.'
    };
  }

  // Instructions for setting up AI service
  getSetupInstructions() {
    return {
      title: 'AI Service Setup Instructions',
      titleAr: 'تعليمات إعداد خدمة الذكاء الاصطناعي',
      steps: [
        {
          step: 1,
          instruction: 'Install Ollama from https://ollama.ai',
          instructionAr: 'قم بتثبيت Ollama من https://ollama.ai'
        },
        {
          step: 2,
          instruction: 'Run: ollama serve',
          instructionAr: 'شغل الأمر: ollama serve'
        },
        {
          step: 3,
          instruction: 'Pull a model: ollama pull llama2',
          instructionAr: 'اسحب نموذج: ollama pull llama2'
        },
        {
          step: 4,
          instruction: 'Restart Shahin-AI KSA application',
          instructionAr: 'أعد تشغيل تطبيق شاهين الذكي السعودية'
        }
      ]
    };
  }
}

// Export singleton instance
export const aiService = new AIService();
export default aiService;
