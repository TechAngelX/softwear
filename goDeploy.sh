#!/bin/bash

echo "DEPLOYING softWEAR"

SERVER_USER="rangel03"
SERVER_HOST="slurm01.dcs.bbk.ac.uk"
GATEWAY="rangel03@gateway.dcs.bbk.ac.uk"

echo "Building softWEAR application..."
npm run build
echo "Build complete."

echo "Packaging..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DEPLOY_DIR="softwear-app-$TIMESTAMP"
mkdir $DEPLOY_DIR
cp -r dist/* $DEPLOY_DIR/

cat > $DEPLOY_DIR/setup.sh << 'SETUPEOF'
#!/bin/bash

# Define the target web directory
TARGET_DIR="~/public_www/softwear"
EVAL_TARGET_DIR=$(eval echo $TARGET_DIR)

if [ -d "$EVAL_TARGET_DIR" ]; then
   echo "Backing up existing softwear directory..."
   mv "$EVAL_TARGET_DIR" "${EVAL_TARGET_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
fi

echo "Creating new application directory..."
mkdir -p "$EVAL_TARGET_DIR"

echo "Moving new files into place..."
mv ./* "$EVAL_TARGET_DIR"/ 2>/dev/null || true

echo "Setting permissions..."
chmod -R 755 "$EVAL_TARGET_DIR"

echo "Deployment complete!"
echo "Available at: https://titan.dcs.bbk.ac.uk/~rangel03/softwear/"
SETUPEOF

chmod +x $DEPLOY_DIR/setup.sh

echo "Creating archive..."
tar -czf $DEPLOY_DIR.tar.gz $DEPLOY_DIR/

echo "Uploading and deploying to server via gateway..."
scp -J $GATEWAY $DEPLOY_DIR.tar.gz $SERVER_USER@$SERVER_HOST:

ssh -J $GATEWAY $SERVER_USER@$SERVER_HOST << REMOTE_EOF
  echo "Unpacking archive on server..."
  tar -xzf $DEPLOY_DIR.tar.gz
  
  echo "Running setup script..."
  cd $DEPLOY_DIR
  ./setup.sh
  
  echo "Cleaning up server files..."
  cd ..
  rm -rf $DEPLOY_DIR $DEPLOY_DIR.tar.gz
REMOTE_EOF

echo "Cleaning up local files..."
rm -rf $DEPLOY_DIR $DEPLOY_DIR.tar.gz

echo "Deployment complete!"
echo "https://titan.dcs.bbk.ac.uk/~rangel03/softwear/"
