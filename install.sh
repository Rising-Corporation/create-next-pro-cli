#!/bin/bash
# Script d'installation pour create-next-pro

COMPLETION_SCRIPT="$(pwd)/create-next-pro-completion.sh"
BASHRC="$HOME/.bashrc"

read -p "Voulez-vous ajouter l'autocomplétion create-next-pro à votre .bashrc ? [O/n] " yn
case $yn in
    [Nn]*) echo "ℹ️ Autocomplétion non ajoutée"; exit;;
    *)
        if ! grep -q "$COMPLETION_SCRIPT" "$BASHRC"; then
            echo "source $COMPLETION_SCRIPT" >> "$BASHRC"
            echo "✅ Script d'autocomplétion ajouté à .bashrc"
        else
            echo "ℹ️ Script déjà présent dans .bashrc"
        fi
    ;;
esac
