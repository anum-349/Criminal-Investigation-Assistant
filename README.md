# Criminal Investigation Assistant

A modern, real-time web application designed for law enforcement agencies to manage cases, evidence, suspects, and investigative workflows. Built with React, Vite, and WebSocket for live notifications.

## Features

### Case Management
- Create, search, and manage investigation cases
- Track case status (Active, Closed, Draft)
- Organize evidence and witness information
- Generate investigation reports

### Real-Time Notifications
- WebSocket-based live updates for new cases, alerts, and activities
- Toast notifications with configurable sound alerts
- Persistent notification panel with unread tracking
- Mark notifications as read or delete individually

### Role-Based Access Control
- **Investigator Role**: Full access to case management, analytics, and profile
- **Admin Role**: System administration, user management, audit logs, analytics
- **Superadmin Role**: Complete system control

### Analytics & Reporting
- Dashboard with investigation trends
- Crime hotspot detection and mapping
- Suspect matching algorithms
- Generate and export case reports

### User Management (Admin)
- User account provisioning and management
- Support ticket tracking
- System settings and configuration
- Audit logging for compliance

### Interactive Mapping
- Leaflet-based map visualization
- Cached tile layers for performance
- Location-based case tracking

## Tech Stack

### Frontend
- **React 19.2** - UI framework
- **Vite 7.2** - Build tool
- **React Router 7.11** - Client-side routing
- **TailwindCSS 4.1** - Styling
- **Lucide React** - Icon library
- **Recharts** - Data visualization
- **Leaflet & React-Leaflet** - Mapping
- **Axios** - HTTP client
- **JWT-Decode** - Token handling

### Backend Integration
- REST API endpoints for CRUD operations
- WebSocket API for real-time notifications
- Bearer token authentication
- Request/response error handling

### Desktop (Optional)
- **Electron 39** - Desktop app wrapper
- **Electron-Builder** - Packaging and distribution

## Project Structure

```
src/
├── components/          # React components
│   ├── Header.jsx       # Navigation and notification bell
│   ├── InvestigatorPicker.jsx
│   ├── HotSpot/         # Crime hotspot visualization
│   ├── ToastContainer/  # Toast notification UI
│   └── ui/              # Reusable UI components
├── context/             # React Context providers
│   ├── AuthContext.jsx  # Authentication state
│   ├── ToastContext.jsx # Toast notifications state
│   ├── RealtimeContext.jsx # WebSocket connection state
│   └── useRealtime.js   # Custom WebSocket hook
├── pages/               # Page components
│   ├── investigator/    # Investigator dashboard and tools
│   ├── admin/           # Admin dashboard and management
│   ├── form/            # Form pages for data entry
│   └── login/           # Authentication page
├── routes/              # Route definitions
│   ├── page.jsx         # Route configuration
│   └── protected-routes/ # Protected route wrapper
├── services/            # API integration
│   ├── notificationApi.js
│   ├── realtimeApi.js   # WebSocket client
│   ├── caseApi.js
│   ├── suspectApi.js
│   ├── evidenceApi.js
│   └── [other API services]
├── utils/               # Utility functions
│   ├── tileCache.js     # Map tile caching
│   └── CachedTileLayer.js
├── assets/              # Static assets
├── App.jsx              # Root component
├── main.jsx             # Entry point
└── index.css            # Global styles
```

## Installation

### Prerequisites
- Node.js 16+ and npm 8+
- Backend API running (see backend requirements)

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd criminal-investigation-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_API_URL=http://localhost:8000
   VITE_TOKEN_KEY=cia_token
   VITE_REMEMBER_KEY=cia_remember
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   Access the application at `http://localhost:5173`

## Development

### Available Scripts

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run ESLint
npm run lint

# Build and run Electron desktop app
npm run electron:dev

# Build Electron distribution
npm run electron:build

# Package Electron without installer
npm run electron:pack
```

### Key Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` (or `Cmd+K` on Mac) | Search cases |
| `Ctrl+N` (or `Cmd+N` on Mac) | Register new case |
| `Ctrl+D` (or `Cmd+D` on Mac) | Go to investigator dashboard |
| `Ctrl+/` (or `Cmd+/` on Mac) | Open help |
| `Ctrl+P` (or `Cmd+P` on Mac) | Print page |

## Authentication

### Login Flow
1. Navigate to `/login`
2. Enter username/email and password
3. If 2FA is enabled, enter secret code
4. Choose "Remember me" to persist session in localStorage (optional)
5. Token is stored in localStorage or sessionStorage based on preference

### Token Management
- JWT tokens stored in browser storage (localStorage or sessionStorage)
- Automatic token validation on app load
- Token expiration checking with automatic logout
- Bearer token included in all API requests

### Preferences
- Sound alerts for notifications (configurable)
- Email notification settings
- Synced with backend user preferences

## Real-Time Notifications

### WebSocket Connection
- Automatic connection establishment on app load
- Exponential backoff reconnection (500ms → 30s)
- Ping/pong keep-alive mechanism
- Auth-related close codes terminate reconnection

### Notification Flow
1. Backend sends notification via WebSocket
2. Frontend fetches fresh notifications from API
3. Toast notification displayed (if preferences allow)
4. Notification added to panel with unread badge
5. User can mark as read or delete

### Notification Types
- **Case Alerts**: New cases, case status changes
- **Suspect Detected**: Potential suspect matches
- **Crime Hotspot**: High-crime activity detected
- **System Notifications**: General alerts and updates

## API Integration

### Base URL
All API endpoints are prefixed with `/api`

### Authentication Header
```
Authorization: Bearer <jwt_token>
```

### Key Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/notifications` | Fetch notifications list |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| PATCH | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |
| GET | `/notifications/ws` | WebSocket upgrade |
| GET | `/auth/preferences` | Fetch user preferences |
| GET | `/auth/me` | Get current user |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |

See individual service files in `src/services/` for complete API documentation.

## State Management

### Context Providers (in order)
1. **AuthProvider** - User authentication state and login/logout
2. **ToastProvider** - Toast notifications and sound settings
3. **RealtimeProvider** - WebSocket connection and listeners
4. **AppRoutes** - Route configuration with protected routes

### Accessing Context

```jsx
// Authentication
const { user, isAuth, login, logout } = useContext(AuthContext);

// Toasts
const toast = useToast();
toast.success("Operation completed!");
toast.notification("New alert", { severity: "critical" });

// Real-time events
const { status } = useRealtimeEvent((data) => {
  console.log("WebSocket notification:", data);
});
```

## Styling

### TailwindCSS
- Responsive design with mobile-first approach
- Custom color palette (deep-ocean, cool-silver, etc.)
- Utility-first CSS for consistency

### Theme Colors
- Primary: `#1b3c53` (deep-ocean)
- Secondary: `#e8e8e8` (cool-silver)
- Success: `#10b981` (emerald)
- Error: `#ef4444` (red)
- Warning: `#f59e0b` (amber)

## Performance Optimizations

### Code Splitting
- Lazy loading of route components
- Reduces initial bundle size

### Memoization
- React.useMemo for expensive computations
- useCallback for stable function references
- Prevents unnecessary re-renders

### Caching
- Tile layer caching for map performance
- Notification fetch deduplication
- Local sound preference caching

## Troubleshooting

### WebSocket Connection Issues
- Check backend WebSocket endpoint is running
- Verify `VITE_API_URL` environment variable
- Check browser console for connection errors
- Look for auth-related close codes (4401, 4403, 4404)

### Notifications Not Appearing
- Verify backend is sending notifications
- Check user preferences allow notifications
- Check browser console for errors
- Ensure WebSocket connection is established

### Authentication Issues
- Clear localStorage and sessionStorage
- Verify backend authentication endpoint
- Check JWT token format and expiration
- Verify `VITE_TOKEN_KEY` matches backend

### Performance Issues
- Check Network tab in DevTools for slow API calls
- Verify map tile caching is working
- Check for console warnings about re-renders
- Inspect bundle size with `npm run build`

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Security Considerations

### Token Storage
- Tokens stored in browser storage (not HttpOnly cookies)
- Clear tokens on logout
- Validate token expiration before use

### API Security
- All requests include Bearer token
- CORS must be configured on backend
- Content Security Policy headers recommended

### Input Validation
- Sanitize user input in forms
- Validate API responses before rendering
- Error boundaries for React errors

## Deployment

### Production Build
```bash
npm run build
```
Output: `dist/` directory

### Deploy to Server
1. Build the application
2. Serve `dist/` folder via HTTP server (nginx, Apache, etc.)
3. Configure API proxy to backend
4. Set `VITE_API_URL` environment variable
5. Enable CORS on backend for production domain

### Docker (Optional)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

### Desktop App Distribution
```bash
npm run electron:build
```
Generates installers in `release/` directory

## License

[Your License Here]

## Support & Contributing

For issues, feature requests, or contributions, please visit the project repository or contact the development team.

## Changelog

### v0.0.0 (Initial Release)
- Case management system
- Real-time WebSocket notifications
- Role-based access control
- Investigation analytics
- User and admin dashboards
- Map-based case visualization
