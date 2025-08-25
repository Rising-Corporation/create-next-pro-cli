#!/bin/bash
# Installation script for create-next-pro

# Detect runtimes
bun_path=$(command -v bun)
deno_path=$(command -v deno)
node_path=$(command -v node)

if [ -n "$bun_path" ]; then
    echo "Bun detected at $bun_path. Using Bun shebang."
    sed -i '1s|.*|#!/usr/bin/env bun|' dist/bin.js
elif [ -n "$deno_path" ]; then
    echo "Deno detected at $deno_path. Using Deno shebang."
    sed -i '1s|.*|#!/usr/bin/env deno|' dist/bin.js
elif [ -n "$node_path" ]; then
    echo "Node.js detected at $node_path. Using Node shebang."
    sed -i '1s|.*|#!/usr/bin/env node|' dist/bin.js
else
    echo "No compatible runtime (Bun, Deno, Node.js) found."
    read -p "Do you want to install Bun? [Y/n] " yn
    case $yn in
        [Nn]*)
            echo "Installation cancelled. Do you want to delete the parent folder? [Y/n] "
            read delyn
            case $delyn in
                [Nn]*) echo "Folder kept."; exit 1;;
                *)
                    parent_dir="$(dirname $(pwd))"
                    echo "Deleting folder $parent_dir..."
                    rm -rf "$parent_dir"
                    echo "Folder deleted."
                    exit 1
                ;;
            esac
            ;;
        *)
            echo "Please install Bun, node or Deno!"
            echo "Installation instructions:"
            echo "Bun: https://bun.com/"
            echo "Node.js: https://nodejs.org/"
            echo "Deno: https://deno.land/"
            exit 1
            ;;
    esac
fi

COMPLETION_SCRIPT="$(pwd)/create-next-pro-completion.sh"

# Choose shell for autocompletion
read -p "Which shell do you use? [1] zsh, [2] bash (default: bash): " shell_choice
case $shell_choice in
    1|zsh|Zsh)
        RC_FILE="$HOME/.zshrc"
        SHELL_NAME="zsh"
        ;;
    *)
        RC_FILE="$HOME/.bashrc"
        SHELL_NAME="bash"
        ;;
esac

read -p "Do you want to add create-next-pro autocompletion to your $SHELL_NAME rc file? [Y/n] " yn
case $yn in
    [Nn]*) echo "ℹ️ Autocompletion not added"; exit;;
    *)
        if ! grep -q "$COMPLETION_SCRIPT" "$RC_FILE"; then
            echo "source $COMPLETION_SCRIPT" >> "$RC_FILE"
            echo "✅ Autocompletion script added to $RC_FILE"
        else
            echo "ℹ️ Script already present in $RC_FILE"
        fi
    ;;
esac
