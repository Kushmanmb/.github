# Bash Configuration

This repository includes a `.bashrc` file with custom bash functions.

## cwhois Function

The `cwhois` function is a custom whois wrapper that queries bgp.tools for network information.

### Usage

To use the `cwhois` function, source the `.bashrc` file in your shell:

```bash
source .bashrc
```

Then you can use the function:

```bash
cwhois <query>
```

### Example

```bash
# Query information about an IP address or AS number
cwhois 8.8.8.8
cwhois AS15169
```

The function automatically adds the `-v` (verbose) flag and queries the bgp.tools whois server.

### How it works

The function is defined as:
```bash
cwhois() {
    whois -h bgp.tools -v $*
}
export -f cwhois
```

This wraps the standard `whois` command to always use the bgp.tools server with verbose output enabled (`-v` flag).
