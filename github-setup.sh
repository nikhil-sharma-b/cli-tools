#!/bin/bash

# Prompt for GitHub username and email
read -p "Enter your GitHub username: " github_username
read -p "Enter your GitHub email: " github_email

# Configure Git global settings
git config --global user.name "$github_username"
git config --global user.email "$github_email"

echo "Git user configuration completed."

# Generate SSH key
ssh-keygen -t ed25519 -C "$github_email" -f ~/.ssh/id_ed25519 -N ""

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Display the public key
echo -e "\nYour SSH public key (add this to GitHub):\n"
cat ~/.ssh/id_ed25519.pub

echo -e "\nInstructions:"
echo "1. Copy the SSH public key above"
echo "2. Go to GitHub.com → Settings → SSH and GPG keys"
echo "3. Click 'New SSH key'"
echo "4. Paste your key and save"
echo -e "\nTo test your SSH connection, run: ssh -T git@github.com"