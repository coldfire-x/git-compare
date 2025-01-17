.PHONY: install install-backend install-frontend start start-backend start-frontend start-electron clean

# Default target
all: install start

# Install all dependencies
install: install-backend install-frontend
	npm install

# Install backend dependencies
install-backend:
	cd backend && npm install

# Install frontend dependencies
install-frontend:
	cd frontend && npm install

# Start all components
start: start-backend start-frontend start-electron

# Start backend server
start-backend:
	cd backend && npm start &

# Start frontend development server
start-frontend:
	cd frontend && npm start &

# Start Electron application
start-electron:
	npm start

# Clean installation
clean:
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf frontend/node_modules
	rm -rf package-lock.json
	rm -rf backend/package-lock.json
	rm -rf frontend/package-lock.json

# Development mode - starts backend and frontend only
dev: start-backend start-frontend

# Help target
help:
	@echo "Available targets:"
	@echo "  make install        - Install all dependencies"
	@echo "  make start         - Start all components (backend, frontend, and electron)"
	@echo "  make dev           - Start backend and frontend servers only"
	@echo "  make clean         - Remove all node_modules and package-lock.json files"
	@echo "  make help          - Show this help message" 