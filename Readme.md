Small script to download and bundle XML files for OpenSeaMap.

# Local Build (optional)

To build the image locally from git run:

```
 docker build -t OpenSeaMap/BundleCompressor .
```

# Run

The script will download all XML-Files into the volume `/dataTmp`
and put the output data into `/dataOut`. Mount these volumes in order to get the files:


```
docker run -it --rm -v /path/for/out/data:/dataOut -v /path/for/tmp/data:/dataTmp OpenSeaMap/BundleCompressor
```
