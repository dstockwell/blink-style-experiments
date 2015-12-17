# Blink style experiments

## Setting up

1. [Check out and build Chromium.](https://www.chromium.org/developers/how-tos/get-the-code)

2. [Install Node.js.](https://nodejs.org/en/)

3. Install R:

    + On Goobuntu, `sudo apt-get install r-google`.

    + Otherwise, install from the [R project site](https://www.r-project.org/).

4. [Install Pandoc.](https://github.com/jgm/pandoc/releases/latest)

    + This is used to generate HTML reports.

5. Install R dependencies:

    + `R -e install.packages("rmarkdown", "ggplot2", "nnls")`

6. Install Node.js dependencies:

    + `npm install`

    + `node -e 'require("erlenmeyer")' && echo OK`



## Running the experiments

Run `./collect.sh` to start the experiment. This command will open multiple Chromium windows as the experiment runs. Data will be stored in the `traces/` directory.

Run `./process.sh` to mush these traces into a CSV file.


### Optional: Using Xephyr

[Xephyr](http://www.freedesktop.org/wiki/Software/Xephyr/) is an X11 server that runs in its own window. It can isolate the Chromium instances used in the experiment, so you can continue with other work while the tests run.

To use Xephyr, run the following commands:

```sh
Xephyr -screen 1024x768 :1 &
export DISPLAY=:1
./collect.sh
```

Note that since Xephyr renders in software, graphics-intensive experiments may run slower than usual. Be sure to take this into account when interpreting the results.


## Compiling the report

Run `R -e 'rmarkdown::render("report.Rmd")'` to compile the report. This should result in two files: `report.md` and `report.html`. The HTML file can be viewed in your favorite browser.
