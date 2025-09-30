# AI TestGen Chrome Extension

A powerful Chrome extension that uses AI to automatically generate test code for web applications. Select elements on any webpage and generate comprehensive test scripts for popular testing frameworks like Playwright, Cypress, and Selenium.

## Features

- 🎯 **Element Selection**: Visual element picker with hover highlighting
- 🤖 **AI-Powered**: Supports multiple AI providers (OpenAI, Anthropic, DeepSeek, Groq)
- 🧪 **Multiple Frameworks**: Generate tests for Playwright, Cypress, and Selenium
- 💬 **Chat Interface**: Interactive DevTools panel for advanced test generation
- 📝 **Template-Based**: Smart test templates with Page Object Model support
- 🎨 **Modern UI**: Clean, intuitive interface built with React

## Supported Testing Frameworks

- **Playwright** (JavaScript & Python)
- **Cypress** (JavaScript)
- **Selenium** (Java & Python)

## Supported AI Providers

- OpenAI (GPT-3.5, GPT-4)
- Anthropic (Claude)
- DeepSeek
- Groq

## Installation

### From Source

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd AITestGen
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder

## Usage

### Basic Usage

1. **Configure Settings**:
   - Click the extension icon in the toolbar
   - Go to the "Settings" tab
   - Select your preferred testing framework
   - Choose an AI provider and enter your API key
   - Configure additional options (comments, Page Object Model, etc.)

2. **Select Elements**:
   - Navigate to the webpage you want to test
   - Click "Start Inspecting" in the extension popup
   - Hover over elements to see them highlighted
   - Click elements to select them for test generation

3. **Generate Tests**:
   - Click "Generate Test" in the popup
   - Or use the DevTools panel for more advanced options

### DevTools Panel

1. Open Chrome DevTools (F12)
2. Navigate to the "AI TestGen" panel
3. Use the chat interface to describe what you want to test
4. View generated test code and chat history

### Element Selection

The extension provides visual feedback when selecting elements:
- **Blue highlight**: Element being hovered
- **Green highlight**: Element selected for testing
- **Tooltip**: Shows element information (tag, id, class, text)

## Configuration

### AI Provider Setup

#### OpenAI
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Enter the key in the extension settings
3. Select your preferred model (gpt-3.5-turbo, gpt-4, etc.)

#### Anthropic (Claude)
1. Get an API key from [Anthropic](https://console.anthropic.com/)
2. Enter the key in the extension settings
3. Select your preferred model (claude-3-sonnet, claude-3-haiku, etc.)

#### DeepSeek
1. Get an API key from [DeepSeek](https://platform.deepseek.com/)
2. Enter the key in the extension settings

#### Groq
1. Get an API key from [Groq](https://console.groq.com/)
2. Enter the key in the extension settings

### Testing Framework Options

- **Include Comments**: Add explanatory comments to generated test code
- **Use Page Object Model**: Generate Page Object Model classes for better test organization
- **Custom Selectors**: Prefer CSS selectors or XPath for element identification

## Development

### Project Structure

```
src/
├── assets/           # Extension icons
├── background/       # Background service worker
├── content/          # Content scripts
├── devtools/         # DevTools panel
├── popup/           # Extension popup UI
├── types/           # TypeScript type definitions
└── utils/           # Utility functions and templates
```

### Building

```bash
# Development build
npm run build

# Production build
npm run build -- --mode=production

# Watch mode for development
npm run dev
```

### Testing

1. Load the extension in Chrome (see Installation)
2. Navigate to `http://localhost:8000/test-page.html` (after running `python3 -m http.server 8000`)
3. Test element selection and test generation features

### Key Components

- **Background Script** (`background/background.ts`): Handles AI API calls and storage
- **Content Script** (`content/content.ts`): Manages element selection and page interaction
- **Popup** (`popup/Popup.tsx`): Main extension interface
- **DevTools Panel** (`devtools/panel.tsx`): Advanced chat interface
- **Test Templates** (`utils/testTemplates.ts`): Framework-specific code generation

## API Integration

The extension communicates with AI providers through the background script to ensure API keys remain secure. All API calls are made from the extension context, not from web pages.

### Message Flow

1. User selects elements and clicks "Generate Test"
2. Content script sends element data to background script
3. Background script calls AI provider API
4. Generated test code is returned to the user interface

## Security

- API keys are stored securely in Chrome's sync storage
- All API calls are made from the extension background script
- No sensitive data is exposed to web pages
- Content Security Policy prevents code injection

## Troubleshooting

### Common Issues

1. **Extension not loading**: Check that all files are built correctly in the `dist` folder
2. **API errors**: Verify your API key is correct and has sufficient credits
3. **Element selection not working**: Ensure the content script is injected properly
4. **DevTools panel not showing**: Refresh the page and reopen DevTools

### Debug Mode

Enable debug logging by setting `DEBUG=true` in the extension settings. Check the browser console for detailed logs.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Changelog

### v1.0.0
- Initial release
- Support for Playwright, Cypress, and Selenium
- Multiple AI provider integration
- Visual element selection
- DevTools panel with chat interface
- Page Object Model support

## Support

For issues and feature requests, please use the GitHub issue tracker.

## Roadmap

- [ ] Support for additional testing frameworks (Jest, Mocha, etc.)
- [ ] Visual test recording and playback
- [ ] Test case management and organization
- [ ] Integration with CI/CD pipelines
- [ ] Advanced element selection strategies
- [ ] Test data generation and management