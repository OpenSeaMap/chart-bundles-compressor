Small script to download and bundle XML files for OpenSeaMap.

# Local Build (optional)

To build the image locally from git run:

```
docker build -t openseamap/chart-bundles-compressor .
```

# Run

The script will download all XML-Files into the volume `/download`,
put the output data into `/out` and save meta files into `/metafiles`.
Mount these volumes in order to get the files:


```
docker run -it --rm -v /path/for/out/data:/out -v /path/for/download/data:/download -v /path/metafiles:/metafiles openseamap/chart-bundles-compressor
```

Example:

```
mkdir data
docker run -it --rm -v $PWD/data/out:/out -v $PWD/data/download:/download -v $PWD/data/metafiles:/metafiles openseamap/chart-bundles-compressor
```
