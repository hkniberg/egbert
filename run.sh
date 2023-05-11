#!/usr/bin/env bash
#
# Purpose: Starts Egbert with logging
#
# Being a little verbose with the shell-foo black magick so others can
# maintain it.
# --------------------------------------------------
trap clean_up 0        # Always run clean_up() upon exit


# --------------------------------------------------
# CONFIGURATION
nr_of_logs_to_save=50


# --------------------------------------------------
# HELPER FUNCTIONS
printlog () {            # Always print timestamp when messaging log
    if [[ "$1" == '-l' ]] ; then
        echo "=================================================="
        shift
    fi
    d=$(date "+%Y-%m-%d-%H:%M:%S")
    echo "$d $@"
}

TMPFILE=$(mktemp)
clean_up () {            # Auto-triggers upon end of execution
    rm -f $TMPFILE
    printlog -l "SCRIPT END" >> $RUNLOG
}



# --------------------------------------------------
# CHANGE DIRECTORY TO WHERE EGBERT LIVES
ME=$0                                 # eg ./run.sh
MYDIR=$(dirname $ME)                  # eg ./
EGBERT_LOCATION=$(realpath $MYDIR)    # eg /data/egbert
cd $EGBERT_LOCATION


# --------------------------------------------------
# PREP FOR LOGGING
LOGDIR=$EGBERT_LOCATION/logs          # location of all logs
mkdir -p $LOGDIR                      # create directory if necessary

datetime=$(date "+%Y%m%d-%H%M%S")     # timestamp
RUNLOG=$LOGDIR/egbert-${datetime}.log # this current run's logfile
touch $RUNLOG                         # create the logfile
RUN_SYMLINK=$LOGDIR/egbert.log        # this always points at most recent log
ln -sf $RUNLOG $RUN_SYMLINK           # create or override existing symlink


# --------------------------------------------------
# LOG EVERYTHING FROM THIS POINT
exec >>   >(tee $RUNLOG)   2>&1
printlog -l "SCRIPT START"


printlog -l "Checking if old logs should be deleted"
find $LOGDIR -type f -name 'egbert*log' | sort > $TMPFILE
logfiles_found=$(cat $TMPFILE | wc -l)

if [[ $logfiles_found -gt $nr_of_logs_to_save ]] ; then
    diff=$(( $logfiles_found - $nr_of_logs_to_save ))
    printlog "Deleting old logs ($diff)"
    for old_log in $(head -n $diff $TMPFILE) ; do
        rm -v $old_log
    done
fi


printlog -l "Ensure node_modules is up-to-date"
npm -d install


printlog -l "Launch Egbert"
npm start


# --------------------------------------------------
# ENSURE HAPPY ENDING IF WE GET HERE
exit 0
