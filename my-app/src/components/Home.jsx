import React, { useState, useRef, useEffect } from 'react';
import { Send, Download, Sparkles, ChevronLeft, ChevronRight, Plus, Trash2, Edit3, X, Check, Paperclip, FileText, Upload, Menu, XCircle } from 'lucide-react';

const API_URL = 'http://localhost:5000/api';

const Home = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pptData, setPptData] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const [email, setEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(true);
  const [editingSlide, setEditingSlide] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const attachmentRef = useRef(null);
  const fileInputRef = useRef(null);
  const [authToken, setAuthToken] = useState('');
  const [abortController, setAbortController] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachmentMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (authToken) {
      loadChatHistory();
    }
  }, [authToken]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      } else {
        setSidebarOpen(false);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleEmailSubmit = async () => {
    if (email && email.includes('@')) {
      try {
        const name = email.split('@')[0];
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
        
        const response = await fetch(`${API_URL}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, name: formattedName })
        });

        const data = await response.json();
        
        if (data.success) {
          setAuthToken(data.token);
          setUserName(formattedName);
          setShowEmailInput(false);
          handleNewChat();
        }
      } catch (error) {
        console.error('Registration error:', error);
        alert('Failed to register. Please try again.');
      }
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/chat`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success && data.chats.length > 0) {
        const formattedChats = data.chats.map(chat => ({
          id: chat.chatId,
          title: chat.title,
          messages: chat.messages
        }));
        setChatHistory(formattedChats);
        
        // Always start with empty state
        handleNewChat();
      } else {
        handleNewChat();
      }
    } catch (error) {
      console.error('Load chat history error:', error);
      handleNewChat();
    }
  };

  const saveChatToBackend = async (chatId, title, msgs) => {
    try {
      await fetch(`${API_URL}/chat/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          chatId,
          title,
          messages: msgs
        })
      });
    } catch (error) {
      console.error('Save chat error:', error);
    }
  };

  const callGeminiAPI = async (prompt, file = null) => {
    const controller = new AbortController();
    setAbortController(controller);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(`${API_URL}/presentation/generate`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
  },
  body: JSON.stringify({ prompt }),
  signal: controller.signal
});


      const data = await response.json();

      if (!response.ok || !data.success) {
        console.error("API Error Response:", data);
        throw new Error(data.message || "Failed to generate presentation");
      }

      const slidesJson = data.data;

      if (!slidesJson.slides || !Array.isArray(slidesJson.slides)) {
        console.error("Invalid response structure:", slidesJson);
        return {
          error: true,
          message: "AI could not generate a valid presentation. Please refine your request.",
          title: "Error"
        };
      }

      return slidesJson;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Generation cancelled');
      }
      console.error("Gemini API Error:", error);
      throw new Error(error.message || "Failed to connect to AI service.");
    } finally {
      setAbortController(null);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain'
    ];

    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF, Word document, or text file');
      return;
    }

    setUploading(true);
    setShowAttachmentMenu(false);

    const userMessage = { role: 'user', content: `Uploaded file: ${file.name}` };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const response = await callGeminiAPI(`Create a presentation from this file: ${file.name}`, file);
      
      if (response.error) {
        const errorMsg = { role: 'assistant', content: response.message, isError: true };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        setPptData(response);
        setCurrentSlide(0);
        const assistantMessage = {
          role: 'assistant',
          content: `Generated "${response.title}" with ${response.slides.length} slides from your file`,
          pptData: response
        };
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        
        const newTitle = response.title.substring(0, 30) + (response.title.length > 30 ? '...' : '');
        
        setChatHistory(prev => prev.map(chat => 
          chat.id === activeChatId 
            ? { ...chat, title: newTitle, messages: finalMessages }
            : chat
        ));

        await saveChatToBackend(activeChatId, newTitle, finalMessages);
      }
    } catch (error) {
      const errorMsg = { 
        role: 'assistant', 
        content: error.message === 'Generation cancelled' ? 'Generation cancelled by user.' : 'Sorry, there was an error processing your file. Please try again.',
        isError: true 
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setLoading(false);
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await callGeminiAPI(input);
      
      if (response.error) {
        const errorMsg = { role: 'assistant', content: response.message, isError: true };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        setPptData(response);
        setCurrentSlide(0);
        const assistantMessage = {
          role: 'assistant',
          content: `Generated "${response.title}" with ${response.slides.length} slides`,
          pptData: response
        };
        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        
        const newTitle = response.title.substring(0, 30) + (response.title.length > 30 ? '...' : '');
        
        setChatHistory(prev => prev.map(chat => 
          chat.id === activeChatId 
            ? { ...chat, title: newTitle, messages: finalMessages }
            : chat
        ));

        await saveChatToBackend(activeChatId, newTitle, finalMessages);
      }
    } catch (error) {
      if (error.message !== 'Generation cancelled') {
        const errorMsg = { 
          role: 'assistant', 
          content: 'Sorry, there was an error. Please try again.',
          isError: true 
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!pptData) return;
    try {
      const response = await fetch(`${API_URL}/presentation/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ presentationData: pptData })
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pptData.title.replace(/[^a-z0-9]/gi, '_')}.pptx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download. Please try again.');
    }
  };

  const handleEditSlide = (slideIndex) => {
    setEditingSlide(slideIndex);
    setEditContent(pptData.slides[slideIndex].content.join('\n'));
  };

  const handleSaveEdit = () => {
    const updatedSlides = [...pptData.slides];
    updatedSlides[editingSlide].content = editContent.split('\n').filter(line => line.trim());
    setPptData({ ...pptData, slides: updatedSlides });
    setEditingSlide(null);
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    const newChat = { id: newId, title: 'New Presentation', messages: [] };
    setChatHistory(prev => [newChat, ...prev]);
    setActiveChatId(newId);
    setMessages([]);
    setPptData(null);
    setCurrentSlide(0);
    setShowPreview(false);
    setMobileMenuOpen(false);
  };

  const handleCreatePresentation = (promptText) => {
    setInput(promptText);
    setShowAttachmentMenu(false);
  };

  const handleUploadFile = () => {
    fileInputRef.current?.click();
    setShowAttachmentMenu(false);
  };

  const handleChatSelect = (chat) => {
    setActiveChatId(chat.id);
    setMessages(chat.messages);
    const lastPPT = chat.messages.findLast(m => m.pptData);
    setPptData(lastPPT?.pptData || null);
    setCurrentSlide(0);
    setMobileMenuOpen(false);
    setShowPreview(false);
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (chatHistory.length === 1) return;
    
    try {
      await fetch(`${API_URL}/chat/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      setChatHistory(prev => prev.filter(c => c.id !== chatId));
      
      if (activeChatId === chatId) {
        const remaining = chatHistory.filter(c => c.id !== chatId);
        if (remaining.length > 0) {
          handleChatSelect(remaining[0]);
        }
      }
    } catch (error) {
      console.error('Delete chat error:', error);
    }
  };

  if (showEmailInput) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white px-4">
        <div className="max-w-md w-full px-4 sm:px-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-900 rounded-2xl mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome to SlideMinds</h1>
            <p className="text-gray-600">Enter your email to continue</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-4 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              onKeyPress={(e) => e.key === 'Enter' && handleEmailSubmit()}
            />
            <button
              onClick={handleEmailSubmit}
              disabled={!email || !email.includes('@')}
              className="w-full px-4 py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
            >
              Continue
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className={`${sidebarOpen || mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} fixed lg:static inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300`}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">SlideMinds</h2>
                <p className="text-xs text-gray-500">Hello, {userName}</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            New Presentation
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">Recent</p>
          {chatHistory.map(chat => (
            <div
              key={chat.id}
              onClick={() => handleChatSelect(chat)}
              className={`group flex items-center justify-between gap-2 px-3 py-3 mb-1 rounded-lg cursor-pointer transition-all ${
                activeChatId === chat.id 
                  ? 'bg-gray-100 border-l-4 border-gray-900' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${
                  activeChatId === chat.id ? 'text-gray-900' : 'text-gray-700'
                }`}>
                  {chat.title}
                </p>
                <p className="text-xs text-gray-500">{chat.messages.length} messages</p>
              </div>
              {chatHistory.length > 1 && (
                <button
                  onClick={(e) => handleDeleteChat(chat.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-gray-200 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4 text-gray-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Chat Area */}
        <div className={`${showPreview && pptData ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-white`}>
          <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => window.innerWidth >= 1024 ? setSidebarOpen(!sidebarOpen) : setMobileMenuOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  {chatHistory.find(c => c.id === activeChatId)?.title || 'New Presentation'}
                </h1>
                <p className="text-xs text-gray-500 hidden sm:block">Create and edit presentations with AI</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pptData && (
                <>
                  <button
                    onClick={() => setShowPreview(true)}
                    className="lg:hidden p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg transition-all font-medium text-sm"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gray-900 rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Create Amazing Presentations</h2>
                <p className="text-gray-600 mb-4 max-w-md text-base sm:text-lg">
                  Just describe what you want, and watch AI create professional slides instantly.
                </p>
                <p className="text-sm text-gray-500 mb-8">
                  Click the <Paperclip className="w-4 h-4 inline" /> icon below to get started
                </p>
              </div>
            ) : (
              <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] sm:max-w-2xl px-4 sm:px-6 py-3 sm:py-4 rounded-xl ${
                        msg.role === 'user'
                          ? 'bg-gray-900 text-white'
                          : msg.isError
                          ? 'bg-red-50 border border-red-200 text-red-700'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap font-medium text-sm sm:text-base">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-base sm:text-lg">👤</span>
                      </div>
                    )}
                  </div>
                ))}
                {(loading || uploading) && (
                  <div className="flex gap-3 sm:gap-4 justify-start">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 sm:w-5 h-4 sm:h-5 text-white animate-pulse" />
                    </div>
                    <div className="bg-gray-100 px-4 sm:px-6 py-3 sm:py-4 rounded-xl">
                      <div className="flex gap-2 items-center">
                        <div className="flex gap-2">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                        <button
                          onClick={handleCancel}
                          className="ml-4 p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Cancel generation"
                        >
                          <XCircle className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 bg-white p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-2 sm:gap-3 relative">
                <div className="relative" ref={attachmentRef}>
                  <button
                    onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                    className="p-3 sm:p-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex-shrink-0"
                    disabled={loading || uploading}
                  >
                    <Paperclip className="w-5 h-5 text-gray-600" />
                  </button>
                  
                  {showAttachmentMenu && (
                    <div className="absolute bottom-full left-0 mb-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden z-50">
                      <div className="p-2">
                        <button
                          onClick={() => handleCreatePresentation('')}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-all text-left group"
                        >
                          <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                            <FileText className="w-5 h-5 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">Create Presentation</p>
                            <p className="text-xs text-gray-500">Generate slides from scratch</p>
                          </div>
                        </button>
                        
                        <button
                          onClick={handleUploadFile}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg transition-all text-left group mt-1"
                        >
                          <div className="w-10 h-10 bg-gray-100 group-hover:bg-gray-200 rounded-lg flex items-center justify-center transition-all">
                            <Upload className="w-5 h-5 text-gray-700" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">Upload File</p>
                            <p className="text-xs text-gray-500">PDF, Word, or Text</p>
                          </div>
                        </button>
                      </div>
                      
                      <div className="border-t border-gray-200 p-2 bg-gray-50">
                        <p className="text-xs font-semibold text-gray-500 uppercase px-4 py-2">Quick Templates</p>
                        {[
                          { text: 'Startup Pitch Deck' },
                          { text: 'Marketing Strategy' },
                          { text: 'Educational Content' },
                          { text: 'Product Launch' }
                        ].map((template, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleCreatePresentation(`Create a ${template.text.toLowerCase()} presentation`)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-white rounded-lg transition-all text-left text-sm"
                          >
                            <span className="text-gray-700">{template.text}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && !uploading && handleSend()}
                  placeholder="Describe your presentation..."
                  className="flex-1 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all text-sm sm:text-base"
                  disabled={loading || uploading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || uploading || !input.trim()}
                  className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-2 font-semibold text-white flex-shrink-0"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {pptData && (
          <div className={`${showPreview ? 'flex' : 'hidden lg:flex'} flex-1 bg-gray-50 border-l border-gray-200 flex-col`}>
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-base sm:text-lg">Slide Preview</h3>
                <p className="text-xs sm:text-sm text-gray-500 truncate">{pptData.slides.length} slides • {pptData.title}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {editingSlide === currentSlide ? (
                <div className="bg-white rounded-xl shadow-lg p-4 sm:p-8 border-2 border-gray-900">
                  <div className="flex items-center justify-between mb-4 sm:mb-6">
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Slide {currentSlide + 1}</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="p-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setEditingSlide(null)}
                        className="p-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={pptData.slides[currentSlide].title}
                    onChange={(e) => {
                      const updated = [...pptData.slides];
                      updated[currentSlide].title = e.target.value;
                      setPptData({ ...pptData, slides: updated });
                    }}
                    className="w-full px-4 py-3 text-lg sm:text-2xl font-bold border border-gray-300 rounded-lg mb-4"
                  />
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none text-sm sm:text-base"
                    placeholder="One point per line..."
                  />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-all">
                  <div className="aspect-[16/9] bg-white p-6 sm:p-12 flex flex-col">
                    <div className="flex items-start justify-between mb-4 sm:mb-8">
                      <h2 className="text-2xl sm:text-4xl font-bold text-gray-900 flex-1 pr-2">{pptData.slides[currentSlide].title}</h2>
                      <button
                        onClick={() => handleEditSlide(currentSlide)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all flex-shrink-0"
                      >
                        <Edit3 className="w-4 sm:w-5 h-4 sm:h-5 text-gray-600" />
                      </button>
                    </div>
                    <div className="flex-1 space-y-2 sm:space-y-4 overflow-y-auto">
                      {pptData.slides[currentSlide].content.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2 sm:gap-3">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-900 rounded-full mt-1.5 sm:mt-2 flex-shrink-0" />
                          <p className="text-base sm:text-xl text-gray-700 leading-relaxed">{point}</p>
                        </div>
                      ))}
                    </div>
                    {pptData.slides[currentSlide].notes && (
                      <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-200">
                        <p className="text-xs sm:text-sm text-gray-500 italic">Notes: {pptData.slides[currentSlide].notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div className="mt-4 sm:mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {pptData.slides.map((slide, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentSlide(idx)}
                    className={`aspect-[16/9] bg-white rounded-lg border-2 p-2 sm:p-3 transition-all hover:border-gray-400 ${
                      currentSlide === idx ? 'border-gray-900 ring-2 ring-gray-900 ring-offset-2' : 'border-gray-200'
                    }`}
                  >
                    <div className="text-left">
                      <p className="text-xs font-bold text-gray-900 truncate">{slide.title}</p>
                      <p className="text-xs text-gray-400 mt-1">Slide {idx + 1}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                  disabled={currentSlide === 0}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-all text-sm sm:text-base"
                >
                  <ChevronLeft className="w-4 sm:w-5 h-4 sm:h-5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>
                
                <div className="text-xs sm:text-sm font-medium text-gray-600">
                  {currentSlide + 1} / {pptData.slides.length}
                </div>
                
                <button
                  onClick={() => setCurrentSlide(Math.min(pptData.slides.length - 1, currentSlide + 1))}
                  disabled={currentSlide === pptData.slides.length - 1}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg transition-all text-sm sm:text-base"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
};

export default Home;