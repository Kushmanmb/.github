# Bash Configuration

This repository includes a `.bashrc` file with custom bash functions.

## custom_whois_query Function

The `custom_whois_query` function is a custom whois wrapper that queries bgp.tools for BGP network information.

### Usage

To use the `custom_whois_query` function, source the `.bashrc` file in your shell:

```bash
source .bashrc
```

Then you can use the function:

```bash
custom_whois_query <query>
```

### Example

```bash
# Query information about an IP address or AS number
custom_whois_query 8.8.8.8
custom_whois_query AS15169
```

The function automatically adds the `-v` (verbose) flag and queries the bgp.tools whois server.

### How it works

The function is defined as:
```bash
custom_whois_query() {
    whois -h bgp.tools -v $*
}
export -f custom_whois_query
```

This wraps the standard `whois` command to always use the bgp.tools server with verbose output enabled (`-v` flag).
